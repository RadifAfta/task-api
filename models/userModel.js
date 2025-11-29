import { pool } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

// CREATE user
export const createUser = async (userData) => {
  const { name, email, passwordHash, role = 'user' } = userData;
  const id = uuidv4();

  const result = await pool.query(
    `INSERT INTO users (id, name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role, created_at`,
    [id, name, email, passwordHash, role]
  );

  return result.rows[0];
};

// READ user by ID
export const findUserById = async (userId) => {
  const result = await pool.query(
    'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0];
};

// READ user by email
export const findUserByEmail = async (email) => {
  const result = await pool.query(
    'SELECT id, name, email, password_hash, role, created_at, updated_at FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0];
};

// UPDATE user
export const updateUser = async (userId, updates) => {
  const { name, email, role } = updates;

  const result = await pool.query(
    `UPDATE users
     SET name = COALESCE($2, name),
         email = COALESCE($3, email),
         role = COALESCE($4, role),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, name, email, role, updated_at`,
    [userId, name, email, role]
  );

  return result.rows[0];
};

// DELETE user
export const deleteUser = async (userId) => {
  const result = await pool.query(
    'DELETE FROM users WHERE id = $1 RETURNING id, name, email',
    [userId]
  );

  return result.rows[0];
};

// CHECK if user exists by email
export const userExistsByEmail = async (email) => {
  const result = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  return result.rows.length > 0;
};

export default {
  createUser,
  findUserById,
  findUserByEmail,
  updateUser,
  deleteUser,
  userExistsByEmail
};


