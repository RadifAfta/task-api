import express from 'express';
import { pool } from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
            'message' : 'Database connected successfully',
            'server_time': result.rows[0].now
        });
    } catch (err) {
        console.error('Database failed to connect:', err.message);
        res.status(500).json({ 'error' : 'Database conection failed'})
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});