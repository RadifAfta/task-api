import { pool } from './config/db.js';
import fs from 'fs';

async function clearDatabase() {
  try {
    const client = await pool.connect();

    // Read the SQL file
    const sql = fs.readFileSync('./clear_database.sql', 'utf8');

    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 50) + '...');
        await client.query(statement);
      }
    }

    console.log('Database cleared successfully!');

    client.release();
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    process.exit();
  }
}

clearDatabase();