import { pool } from '../config/db.js';


// cari user berdasarkan id
export const findUserById = async (userId) => {
    const query = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    return query.rows[0];
}

// cari user berdasarkan email
export const findUserByEmail = async (email) => {
    const query = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return query.rows[0];
}

// buat user baru
export const createUser = async (name, email, passwordHash, role) => {
    let queryText, values;

    if (role) {
        // Jika role dikirim, sertakan dalam query
        queryText = `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role
    `;
        values = [name, email, passwordHash, role];
    } else {
        // Jika role tidak dikirim, biarkan database gunakan default 'user'
        queryText = `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, role
    `;
        values = [name, email, passwordHash];
    }

    const result = await pool.query(queryText, values);
    return result.rows[0];
};


