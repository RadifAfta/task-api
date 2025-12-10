import {
    createTransaction,
    getTransactions,
    getTransactionById,
    updateTransaction,
    deleteTransaction,
} from "../models/transactionModel.js";
import { createPaginationResponse, validatePaginationParams } from "../utils/pagination.js";
import { pool } from "../config/db.js";

// Controller untuk membuat transaksi baru
export const createTransactionController = async (req, res) => {
    try {
        const userId = req.user.id; // Ambil userId dari token
        const { amount, type, category, description, date } = req.body;
        const transactionDate = date || new Date().toISOString().split('T')[0]; // Default ke hari ini jika tidak diisi
        const newTransaction = await createTransaction(userId, amount, type, category, description, transactionDate);
        res.status(201).json({
            message: "Transaksi berhasil dibuat",
            data: newTransaction,
        });
    } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat membuat transaksi" });
    }
}

// Controller untuk mengambil semua transaksi user
export const getTransactionsController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        const transactions = await getTransactions(userId, limit, offset);
        const totalResult = await pool.query('SELECT COUNT(*) FROM transactions WHERE user_id = $1', [userId]);
        const total = parseInt(totalResult.rows[0].count);
        const response = createPaginationResponse(transactions, parseInt(page), parseInt(limit), total);
        res.json(response);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat mengambil transaksi" });
    }
}

// Controller untuk mengambil transaksi berdasarkan ID
export const getTransactionByIdController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const transaction = await getTransactionById(id, userId);
        if (!transaction) {
            return res.status(404).json({ message: "Transaksi tidak ditemukan" });
        }
        res.json({ data: transaction });
    } catch (error) {
        console.error("Error fetching transaction:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat mengambil transaksi" });
    }
}

// Controller untuk memperbarui transaksi
export const updateTransactionController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { amount, type, category, description, date } = req.body;
        const updatedTransaction = await updateTransaction(id, userId, amount, type, category, description, date);
        if (!updatedTransaction) {
            return res.status(404).json({ message: "Transaksi tidak ditemukan" });
        }
        res.json({
            message: "Transaksi berhasil diperbarui",
            data: updatedTransaction,
        });
    } catch (error) {
        console.error("Error updating transaction:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat memperbarui transaksi" });
    }
}

// Controller untuk menghapus transaksi
export const deleteTransactionController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const deletedTransaction = await deleteTransaction(id, userId);
        if (!deletedTransaction) {
            return res.status(404).json({ message: "Transaksi tidak ditemukan" });
        }
        res.json({ message: "Transaksi berhasil dihapus" });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat menghapus transaksi" });
    }
}