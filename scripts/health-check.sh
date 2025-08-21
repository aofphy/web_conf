#!/bin/bash

# Health Check Script
# Usage: ./scripts/health-check.sh [environment]

set -e

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🏥 Performing health checks for $ENVIRONMENT environment..."

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]; then
    export $(cat "$PROJECT_ROOT/.env.$ENVIRONMENT" | grep -v '^#' | xargs)
fi

# Set default ports
BACKEND_PORT=${BACKEND_PORT:-5000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service health
check_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "🔍 Checking $service_name... "
    
    if response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null); then
        if [ "$response" -eq "$expected_status" ]; then
            echo -e "${GREEN}✅ Healthy (HTTP $response)${NC}"
            return 0
        else
            echo -e "${RED}❌ Unhealthy (HTTP $response)${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Unreachable${NC}"
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    echo -n "🔍 Checking database connectivity... "
    
    if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "${DB_USER:-conference_user}" -d "${DB_NAME:-conference_db}" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database is ready${NC}"
        return 0
    else
        echo -e "${RED}❌ Database is not ready${NC}"
        return 1
    fi
}

# Function to check Redis connectivity
check_redis() {
    echo -n "🔍 Checking Redis connectivity... "
    
    if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis is ready${NC}"
        return 0
    else
        echo -e "${RED}❌ Redis is not ready${NC}"
        return 1
    fi
}

# Function to check Docker containers
check_containers() {
    echo "🐳 Checking Docker containers..."
    
    local containers=("conference-postgres-prod" "conference-redis-prod" "conference-backend-prod" "conference-frontend-prod")
    local all_healthy=true
    
    for container in "${containers[@]}"; do
        echo -n "🔍 Checking $container... "
        
        if docker ps --filter "name=$container" --filter "status=running" --format "{{.Names}}" | grep -q "$container"; then
            # Check container health if health check is configured
            health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
            
            case $health_status in
                "healthy")
                    echo -e "${GREEN}✅ Running and healthy${NC}"
                    ;;
                "unhealthy")
                    echo -e "${RED}❌ Running but unhealthy${NC}"
                    all_healthy=false
                    ;;
                "starting")
                    echo -e "${YELLOW}⏳ Starting up${NC}"
                    ;;
                "no-healthcheck")
                    echo -e "${GREEN}✅ Running (no health check)${NC}"
                    ;;
                *)
                    echo -e "${YELLOW}⚠️  Unknown health status: $health_status${NC}"
                    ;;
            esac
        else
            echo -e "${RED}❌ Not running${NC}"
            all_healthy=false
        fi
    done
    
    return $all_healthy
}

# Function to check disk space
check_disk_space() {
    echo "💾 Checking disk space..."
    
    local threshold=80
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    echo -n "🔍 Root filesystem usage: ${usage}%... "
    
    if [ "$usage" -lt "$threshold" ]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ High usage (>${threshold}%)${NC}"
        return 1
    fi
}

# Function to check memory usage
check_memory() {
    echo "🧠 Checking memory usage..."
    
    local mem_info=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
    local threshold=90
    
    echo -n "🔍 Memory usage: ${mem_info}%... "
    
    if (( $(echo "$mem_info < $threshold" | bc -l) )); then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ High usage (>${threshold}%)${NC}"
        return 1
    fi
}

# Main health check execution
main() {
    local exit_code=0
    
    echo "🏥 Starting comprehensive health check..."
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date)"
    echo "----------------------------------------"
    
    # Check Docker containers
    if ! check_containers; then
        exit_code=1
    fi
    
    echo ""
    
    # Check database
    if ! check_database; then
        exit_code=1
    fi
    
    # Check Redis
    if ! check_redis; then
        exit_code=1
    fi
    
    echo ""
    
    # Check backend API
    if ! check_service "Backend API" "http://localhost:$BACKEND_PORT/health"; then
        exit_code=1
    fi
    
    # Check frontend
    if ! check_service "Frontend" "http://localhost:$FRONTEND_PORT/health"; then
        exit_code=1
    fi
    
    # Check metrics endpoint
    if ! check_service "Metrics endpoint" "http://localhost:$BACKEND_PORT/metrics"; then
        exit_code=1
    fi
    
    echo ""
    
    # Check system resources
    if ! check_disk_space; then
        exit_code=1
    fi
    
    if ! check_memory; then
        exit_code=1
    fi
    
    echo ""
    echo "----------------------------------------"
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}🎉 All health checks passed!${NC}"
    else
        echo -e "${RED}❌ Some health checks failed!${NC}"
    fi
    
    return $exit_code
}

# Run main function
main "$@"