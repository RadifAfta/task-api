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

