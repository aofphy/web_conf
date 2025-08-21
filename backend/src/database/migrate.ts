import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'conference_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

// Create migrations table if it doesn't exist
async function createMigrationsTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } finally {
    client.release();
  }
}

// Get executed migrations
async function getExecutedMigrations(): Promise<string[]> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT filename FROM migrations ORDER BY id');
    return result.rows.map(row => row.filename);
  } finally {
    client.release();
  }
}

// Execute a migration
async function executeMigration(filename: string, sql: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Execute the migration SQL
    await client.query(sql);
    
    // Record the migration as executed
    await client.query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
    
    await client.query('COMMIT');
    console.log(`✅ Executed migration: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed to execute migration ${filename}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

// Run all pending migrations
async function runMigrations(): Promise<void> {
  try {
    console.log('🚀 Starting database migrations...');
    
    // Create migrations table
    await createMigrationsTable();
    
    // Get list of executed migrations
    const executedMigrations = await getExecutedMigrations();
    
    // Get all migration files
    const migrationsDir = join(__dirname, 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    // Execute pending migrations
    for (const filename of migrationFiles) {
      if (!executedMigrations.includes(filename)) {
        const filePath = join(migrationsDir, filename);
        const sql = readFileSync(filePath, 'utf-8');
        await executeMigration(filename, sql);
      } else {
        console.log(`⏭️  Skipping already executed migration: ${filename}`);
      }
    }
    
    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export { runMigrations };