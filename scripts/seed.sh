#!/bin/bash

# Database Seeding Script
# Usage: ./scripts/seed.sh [environment]

set -e

ENVIRONMENT=${1:-development}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🌱 Seeding database for $ENVIRONMENT environment..."

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]; then
    echo "📋 Loading environment from .env.$ENVIRONMENT"
    export $(cat "$PROJECT_ROOT/.env.$ENVIRONMENT" | grep -v '^#' | xargs)
elif [ -f "$PROJECT_ROOT/.env" ]; then
    echo "📋 Loading environment from .env"
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
else
    echo "⚠️  No environment file found, using defaults"
fi

# Set default values
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-conference_db}
DB_USER=${DB_USER:-postgres}

echo "🔗 Connecting to database: $DB_HOST:$DB_PORT/$DB_NAME"

# Check if seeding table exists
PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    CREATE TABLE IF NOT EXISTS seeds (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
"

# Run seed files
cd "$PROJECT_ROOT/backend"

for seed_file in src/database/seeds/*.sql; do
    if [ -f "$seed_file" ]; then
        filename=$(basename "$seed_file")
        
        # Check if seed has already been run
        ALREADY_RUN=$(PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT 1 FROM seeds WHERE filename = '$filename');")
        
        if [ "$ALREADY_RUN" = "f" ]; then
            echo "🌱 Running seed: $filename"
            PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$seed_file"
            
            # Record seed as completed
            PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO seeds (filename) VALUES ('$filename');"
            echo "✅ Seed $filename completed"
        else
            echo "⏭️  Seed $filename already applied, skipping"
        fi
    fi
done

# Run TypeScript seed script if it exists
if [ -f "src/database/seed.ts" ]; then
    echo "🌱 Running TypeScript seed script..."
    npm run db:seed
fi

echo "🎉 Database seeding completed successfully for $ENVIRONMENT environment!"