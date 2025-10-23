import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    port: process.env.PG_PORT,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

(async () => {
    try {
        const client = await pool.connect();
        console.log('Connected to the database successfully.');
        client.release();
    } catch (err) {
        console.error('Database connection error:', err.stack);
    }

})();

export default pool;
