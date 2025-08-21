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

// Create seeds table if it doesn't exist
async function createSeedsTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS seeds (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } finally {
    client.release();
  }
}

// Get executed seeds
async function getExecutedSeeds(): Promise<string[]> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT filename FROM seeds ORDER BY id');
    return result.rows.map(row => row.filename);
  } finally {
    client.release();
  }
}

// Execute a seed
async function executeSeed(filename: string, sql: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Execute the seed SQL
    await client.query(sql);
    
    // Record the seed as executed
    await client.query('INSERT INTO seeds (filename) VALUES ($1)', [filename]);
    
    await client.query('COMMIT');
    console.log(`✅ Executed seed: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed to execute seed ${filename}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

// Run all pending seeds
async function runSeeds(): Promise<void> {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Create seeds table
    await createSeedsTable();
    
    // Get list of executed seeds
    const executedSeeds = await getExecutedSeeds();
    
    // Get all seed files
    const seedsDir = join(__dirname, 'seeds');
    const seedFiles = readdirSync(seedsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    // Execute pending seeds
    for (const filename of seedFiles) {
      if (!executedSeeds.includes(filename)) {
        const filePath = join(seedsDir, filename);
        const sql = readFileSync(filePath, 'utf-8');
        await executeSeed(filename, sql);
      } else {
        console.log(`⏭️  Skipping already executed seed: ${filename}`);
      }
    }
    
    console.log('✅ All seeds completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run seeds if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeeds();
}

export { runSeeds };