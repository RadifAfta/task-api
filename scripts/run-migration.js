import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration(migrationFile) {
  try {
    console.log(`Running migration: ${migrationFile}`);

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Connect to database
    const client = await pool.connect();

    // Run migration
    await client.query(migrationSQL);

    client.release();

    console.log(`✅ Migration ${migrationFile} completed successfully!`);
  } catch (error) {
    console.error(`❌ Error running migration ${migrationFile}:`, error);
    process.exit(1);
  }
}

// Get migration file from command line arguments
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node run-migration.js <migration-file>');
  process.exit(1);
}

runMigration(migrationFile);