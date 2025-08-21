#!/bin/bash

# Database Migration Script
# Usage: ./scripts/migrate.sh [environment]

set -e

ENVIRONMENT=${1:-development}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔄 Running database migrations for $ENVIRONMENT environment..."

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

# Check if database exists
if ! PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "🏗️  Database $DB_NAME does not exist, creating..."
    PGPASSWORD=$DB_PASSWORD createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    echo "✅ Database created successfully"
else
    echo "✅ Database $DB_NAME already exists"
fi

# Run migrations
echo "🔄 Running migrations..."
cd "$PROJECT_ROOT/backend"

# Check if migrations table exists
MIGRATION_TABLE_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'migrations');")

if [ "$MIGRATION_TABLE_EXISTS" = "f" ]; then
    echo "📋 Creating migrations table..."
    PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        CREATE TABLE migrations (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    "
fi

# Run each migration file
for migration_file in src/database/migrations/*.sql; do
    if [ -f "$migration_file" ]; then
        filename=$(basename "$migration_file")
        
        # Check if migration has already been run
        ALREADY_RUN=$(PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT 1 FROM migrations WHERE filename = '$filename');")
        
        if [ "$ALREADY_RUN" = "f" ]; then
            echo "🔄 Running migration: $filename"
            PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file"
            
            # Record migration as completed
            PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO migrations (filename) VALUES ('$filename');"
            echo "✅ Migration $filename completed"
        else
            echo "⏭️  Migration $filename already applied, skipping"
        fi
    fi
done

echo "🎉 All migrations completed successfully!"

# Run TypeScript migration script if it exists
if [ -f "src/database/migrate.ts" ]; then
    echo "🔄 Running TypeScript migration script..."
    npm run db:migrate
fi

echo "✅ Database migration process completed for $ENVIRONMENT environment"