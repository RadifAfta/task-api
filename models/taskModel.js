import { pool } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

// CREATE
export const createTask = async (userId, title, description, status, priority, dueDate) => {
  const id = uuidv4();
  const result = await pool.query(
    `INSERT INTO tasks (id, user_id, title, description, status, priority, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, userId, title, description, status, priority, dueDate]
  );
  return result.rows[0];
};

// READ ALL (BY USER)
export const getTasksByUser = async (userId, filters = {}) => {
  const { status, search } = filters;
  let query = `
    SELECT * FROM tasks 
    WHERE user_id = $1
  `;
  const values = [userId];
  let index = 2;

  if (status) {
    query += ` AND status = $${index}`;
    values.push(status);
    index++;
  }

  if (search) {
    query += ` AND (title ILIKE $${index} OR description ILIKE $${index})`;
    values.push(`%${search}%`);
  }

  query += ` ORDER BY created_at DESC`;

  const result = await pool.query(query, values);
  return result.rows;
};


// READ SINGLE
export const getTaskById = async (id, userId) => {
  const result = await pool.query(
    "SELECT * FROM tasks WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return result.rows[0];
};

// UPDATE
export const updateTask = async (id, userId, fields) => {
  const { title, description, status, priority, due_date } = fields;
  const result = await pool.query(
    `UPDATE tasks
     SET 
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       status = COALESCE($3, status),
       priority = COALESCE($4, priority),
       due_date = COALESCE($5, due_date),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $6 AND user_id = $7
     RETURNING *`,
    [title, description, status, priority, due_date, id, userId]
  );
  return result.rows[0];
};

// DELETE
export const deleteTask = async (id, userId) => {
  const result = await pool.query(
    "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *",
    [id, userId]
  );
  return result.rows[0];
};
