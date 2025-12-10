import { pool } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

// CREATE
export const createTransaction = async (userId, amount, type, category, description, date) => {
  const id = uuidv4();
  let query = `INSERT INTO transactions (id, user_id, amount, type, category, description`;
  let values = [id, userId, amount, type, category, description];
  let placeholders = ['$1', '$2', '$3', '$4', '$5', '$6'];

  if (date) {
    query += ', transaction_date';
    values.push(date);
    placeholders.push(`$${values.length}`);
  }

  query += ') VALUES (' + placeholders.join(', ') + ') RETURNING *';

  const result = await pool.query(query, values);
  return result.rows[0];
};

// READ ALL for user
export const getTransactions = async (userId, limit, offset) => {
  const result = await pool.query(
    `SELECT * FROM transactions WHERE user_id = $1 ORDER BY transaction_date DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
};

// READ ONE
export const getTransactionById = async (id, userId) => {
  const result = await pool.query(
    `SELECT * FROM transactions WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0];
};

// UPDATE
export const updateTransaction = async (id, userId, amount, type, category, description, date) => {
  let query = `UPDATE transactions SET amount = $1, type = $2, category = $3, description = $4, updated_at = CURRENT_TIMESTAMP`;
  let values = [amount, type, category, description];

  if (date) {
    query += ', transaction_date = $5';
    values.push(date);
  }

  query += ' WHERE id = $' + (values.length + 1) + ' AND user_id = $' + (values.length + 2) + ' RETURNING *';
  values.push(id, userId);

  const result = await pool.query(query, values);
  return result.rows[0];
};

// DELETE
export const deleteTransaction = async (id, userId) => {
  const result = await pool.query(
    `DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *`,
    [id, userId]
  );
  return result.rows[0];
};