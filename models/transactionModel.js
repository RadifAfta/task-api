import { pool } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

// CREATE
export const createTransaction = async (userId, amount, type, category, description, date) => {
  const id = uuidv4();
  const result = await pool.query(
    `INSERT INTO transactions (id, user_id, amount, type, category, description, transaction_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, userId, amount, type, category, description, date]
  );
  return result.rows[0];
};

