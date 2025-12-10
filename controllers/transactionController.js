import {
  createTransactionService,
  getTransactionsService,
  getTransactionByIdService,
  updateTransactionService,
  deleteTransactionService,
  getTransactionSummaryService,
} from "../services/transactionService.js";
import { createPaginationResponse } from "../utils/pagination.js";

// Controller untuk membuat transaksi baru
export const createTransactionController = async (req, res) => {
  try {
    const userId = req.user.id; // Ambil userId dari token
    const { amount, type, category, description, date } = req.body;
    const transactionDate = date || new Date().toISOString().split('T')[0]; // Default ke hari ini jika tidak diisi

    const newTransaction = await createTransactionService(userId, amount, type, category, description, transactionDate);

    res.status(201).json({
      success: true,
      message: "Transaksi berhasil dibuat",
      data: newTransaction,
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Terjadi kesalahan saat membuat transaksi"
    });
  }
};

// Controller untuk mengambil semua transaksi user
export const getTransactionsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, type, category, dateFrom, dateTo } = req.query;

    const filters = {};
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const result = await getTransactionsService(userId, filters, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result.transactions,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Terjadi kesalahan saat mengambil transaksi"
    });
  }
};

// Controller untuk mengambil transaksi berdasarkan ID
export const getTransactionByIdController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const transaction = await getTransactionByIdService(id, userId);

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("Error fetching transaction:", error);

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Terjadi kesalahan saat mengambil transaksi"
    });
  }
};

// Controller untuk memperbarui transaksi
export const updateTransactionController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    const updatedTransaction = await updateTransactionService(id, userId, updates);

    res.json({
      success: true,
      message: "Transaksi berhasil diperbarui",
      data: updatedTransaction,
    });
  } catch (error) {
    console.error("Error updating transaction:", error);

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || "Terjadi kesalahan saat memperbarui transaksi"
    });
  }
};

// Controller untuk menghapus transaksi
export const deleteTransactionController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const deletedTransaction = await deleteTransactionService(id, userId);

    res.json({
      success: true,
      message: "Transaksi berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Terjadi kesalahan saat menghapus transaksi"
    });
  }
}

// Controller untuk mendapatkan summary transaksi
export const getTransactionSummaryController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dateFrom, dateTo } = req.query;

    const summary = await getTransactionSummaryService(userId, dateFrom, dateTo);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching transaction summary:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Terjadi kesalahan saat mengambil summary transaksi"
    });
  }
};;