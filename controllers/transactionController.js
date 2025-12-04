import {
    createTransaction,
} from "../models/transactionModel.js";
import { createPaginationResponse, validatePaginationParams } from "../utils/pagination.js";

// Controller untuk membuat transaksi baru
export const createTransactionController = async (req, res) => {
    try {
        const userId = req.user.id; // Ambil userId dari token
        const { amount, type, category, description, date } = req.body;
        const newTransaction = await createTransaction(userId, amount, type, category, description, date);
        res.status(201).json({
            message: "Transaksi berhasil dibuat",
            data: newTransaction,
        });
    } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat membuat transaksi" });
    }
}