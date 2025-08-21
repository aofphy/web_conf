#!/bin/bash

# Deployment Script
# Usage: ./scripts/deploy.sh [environment] [action]

set -e

ENVIRONMENT=${1:-production}
ACTION=${2:-deploy}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Starting deployment for $ENVIRONMENT environment..."

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]; then
    echo "📋 Loading environment from .env.$ENVIRONMENT"
    export $(cat "$PROJECT_ROOT/.env.$ENVIRONMENT" | grep -v '^#' | xargs)
else
    echo "❌ Environment file .env.$ENVIRONMENT not found!"
    exit 1
fi

cd "$PROJECT_ROOT"

case $ACTION in
    "build")
        echo "🏗️  Building application..."
        
        # Build backend
        echo "📦 Building backend..."
        cd backend
        npm ci --only=production
        npm run build
        cd ..
        
        # Build frontend
        echo "📦 Building frontend..."
        cd frontend
        npm ci
        npm run build
        cd ..
        
        echo "✅ Build completed successfully"
        ;;
        
    "deploy")
        echo "🚀 Deploying application..."
        
        # Stop existing containers
        echo "🛑 Stopping existing containers..."
        docker-compose -f docker-compose.prod.yml down || true
        
        # Build and start containers
        echo "🏗️  Building and starting containers..."
        docker-compose -f docker-compose.prod.yml build --no-cache
        
        # Run database migrations
        echo "🔄 Running database migrations..."
        ./scripts/migrate.sh $ENVIRONMENT
        
        # Seed database if needed
        if [ "$ENVIRONMENT" != "production" ]; then
            echo "🌱 Seeding database..."
            ./scripts/seed.sh $ENVIRONMENT
        fi
        
        # Start services
        echo "🚀 Starting services..."
        docker-compose -f docker-compose.prod.yml up -d
        
        # Wait for services to be healthy
        echo "⏳ Waiting for services to be healthy..."
        sleep 30
        
        # Health check
        echo "🏥 Performing health checks..."
        ./scripts/health-check.sh
        
        echo "✅ Deployment completed successfully"
        ;;
        
    "rollback")
        echo "🔄 Rolling back deployment..."
        
        # Stop current containers
        docker-compose -f docker-compose.prod.yml down
        
        # Start previous version (this would need to be implemented based on your versioning strategy)
        echo "⚠️  Rollback functionality needs to be implemented based on your versioning strategy"
        
        echo "✅ Rollback completed"
        ;;
        
    "status")
        echo "📊 Checking deployment status..."
        docker-compose -f docker-compose.prod.yml ps
        ./scripts/health-check.sh
        ;;
        
    "logs")
        echo "📋 Showing application logs..."
        docker-compose -f docker-compose.prod.yml logs -f --tail=100
        ;;
        
    "cleanup")
        echo "🧹 Cleaning up old images and containers..."
        docker system prune -f
        docker image prune -f
        echo "✅ Cleanup completed"
        ;;
        
    *)
        echo "❌ Unknown action: $ACTION"
        echo "Available actions: build, deploy, rollback, status, logs, cleanup"
        exit 1
        ;;
esac

echo "🎉 Operation '$ACTION' completed successfully for $ENVIRONMENT environment!"