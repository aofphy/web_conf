import { runMigrations } from './migrate.js';
import { runSeeds } from './seed.js';
import { Database } from './connection.js';

async function initializeDatabase(): Promise<void> {
  try {
    console.log('🚀 Initializing database...');
    
    // Test database connection
    const isHealthy = await Database.healthCheck();
    if (!isHealthy) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection established');

    // Run migrations
    await runMigrations();
    
    // Run seeds
    await runSeeds();
    
    console.log('🎉 Database initialization completed successfully!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase();
}

export { initializeDatabase };