import { pool } from '../config/db.js';


// cari user berdasarkan id
export const findUserById = async (userId) =>{
    const query = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    return query.rows[0];
}

// cari user berdasarkan email
export const findUserByEmail = async (email) =>{
    const query = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return query.rows[0];
}

// buat user baru
export const createUser = async (name, email, passwordHash) =>{
    const query = await pool.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
        [name, email, passwordHash]
    );
    return query.rows[0];
}

