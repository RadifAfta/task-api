import { pool } from "../config/db.js";
import {
  createTransaction as createTransactionModel,
  getTransactions as getTransactionsModel,
  getTransactionById as getTransactionByIdModel,
  updateTransaction as updateTransactionModel,
  deleteTransaction as deleteTransactionModel,
} from "../models/transactionModel.js";

/**
 * Service layer for Transaction operations
 * Handles business logic, data processing, and additional validations
 */

/**
 * Creates a new transaction with business logic validations
 * @param {string} userId - User ID from authentication
 * @param {number} amount - Transaction amount (must be positive)
 * @param {string} type - Transaction type ('income' or 'expense')
 * @param {string} category - Transaction category
 * @param {string} description - Transaction description
 * @param {string} date - Transaction date (optional, defaults to today)
 * @returns {Promise<Object>} Created transaction object
 * @throws {Error} If validation fails or database error occurs
 */
export const createTransactionService = async (userId, amount, type, category, description, date) => {
  try {
    // Business logic validations
    if (!userId) {
      throw new Error("User ID is required");
    }

    if (!amount || amount <= 0) {
      throw new Error("Amount must be a positive number");
    }

    if (!['income', 'expense'].includes(type)) {
      throw new Error("Type must be either 'income' or 'expense'");
    }

    if (!category || category.trim().length === 0) {
      throw new Error("Category is required");
    }

    if (!description || description.trim().length === 0) {
      throw new Error("Description is required");
    }

    // Additional business logic: prevent future dates (allow today)
    if (date) {
      const transactionDate = new Date(date);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      if (transactionDate > todayEnd) {
        throw new Error("Transaction date cannot be in the future");
      }
    }

    // Call model to create transaction
    const transaction = await createTransactionModel(userId, amount, type, category, description, date);

    return transaction;
  } catch (error) {
    console.error("Error in createTransactionService:", error);
    throw error;
  }
};

/**
 * Retrieves transactions for a user with optional filtering and pagination
 * @param {string} userId - User ID from authentication
 * @param {Object} filters - Optional filters (type, category, dateFrom, dateTo)
 * @param {number} page - Page number for pagination
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Object containing transactions array and pagination info
 */
export const getTransactionsService = async (userId, filters = {}, page = 1, limit = 10) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    let query = `SELECT * FROM transactions WHERE user_id = $1`;
    let values = [userId];
    let paramIndex = 2;

    // Apply filters
    if (filters.type && ['income', 'expense'].includes(filters.type)) {
      query += ` AND type = $${paramIndex}`;
      values.push(filters.type);
      paramIndex++;
    }

    if (filters.category) {
      query += ` AND category ILIKE $${paramIndex}`;
      values.push(`%${filters.category}%`);
      paramIndex++;
    }

    if (filters.dateFrom) {
      query += ` AND transaction_date >= $${paramIndex}`;
      values.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      query += ` AND transaction_date <= $${paramIndex}`;
      values.push(filters.dateTo);
      paramIndex++;
    }

    // Get total count for pagination
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await pool.query(countQuery, values);
    const totalItems = parseInt(countResult.rows[0].count);

    // Add ordering and pagination
    query += ` ORDER BY transaction_date DESC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, (page - 1) * limit);

    const result = await pool.query(query, values);
    const transactions = result.rows;

    // Calculate pagination info
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      transactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
      },
    };
  } catch (error) {
    console.error("Error in getTransactionsService:", error);
    throw error;
  }
};

/**
 * Retrieves a single transaction by ID for a specific user
 * @param {string} id - Transaction ID
 * @param {string} userId - User ID from authentication
 * @returns {Promise<Object>} Transaction object
 * @throws {Error} If transaction not found or access denied
 */
export const getTransactionByIdService = async (id, userId) => {
  try {
    if (!id || !userId) {
      throw new Error("Transaction ID and User ID are required");
    }

    const transaction = await getTransactionByIdModel(id, userId);

    if (!transaction) {
      throw new Error("Transaction not found or access denied");
    }

    return transaction;
  } catch (error) {
    console.error("Error in getTransactionByIdService:", error);
    throw error;
  }
};

/**
 * Updates a transaction with business logic validations
 * @param {string} id - Transaction ID
 * @param {string} userId - User ID from authentication
 * @param {Object} updates - Fields to update (amount, type, category, description, date)
 * @returns {Promise<Object>} Updated transaction object
 * @throws {Error} If validation fails or transaction not found
 */
export const updateTransactionService = async (id, userId, updates) => {
  try {
    if (!id || !userId) {
      throw new Error("Transaction ID and User ID are required");
    }

    // Validate updates
    const allowedFields = ['amount', 'type', 'category', 'description', 'transaction_date'];
    const filteredUpdates = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined && value !== null) {
        filteredUpdates[key] = value;
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      throw new Error("No valid fields to update");
    }

    // Business logic validations for specific fields
    if (filteredUpdates.amount !== undefined && (filteredUpdates.amount <= 0)) {
      throw new Error("Amount must be a positive number");
    }

    if (filteredUpdates.type !== undefined && !['income', 'expense'].includes(filteredUpdates.type)) {
      throw new Error("Type must be either 'income' or 'expense'");
    }

    if (filteredUpdates.transaction_date) {
      const transactionDate = new Date(filteredUpdates.transaction_date);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      if (transactionDate > todayEnd) {
        throw new Error("Transaction date cannot be in the future");
      }
    }

    // Call model to update
    const transaction = await updateTransactionModel(
      id,
      userId,
      filteredUpdates.amount,
      filteredUpdates.type,
      filteredUpdates.category,
      filteredUpdates.description,
      filteredUpdates.transaction_date
    );

    if (!transaction) {
      throw new Error("Transaction not found or access denied");
    }

    return transaction;
  } catch (error) {
    console.error("Error in updateTransactionService:", error);
    throw error;
  }
};

/**
 * Deletes a transaction
 * @param {string} id - Transaction ID
 * @param {string} userId - User ID from authentication
 * @returns {Promise<Object>} Deleted transaction object
 * @throws {Error} If transaction not found or access denied
 */
export const deleteTransactionService = async (id, userId) => {
  try {
    if (!id || !userId) {
      throw new Error("Transaction ID and User ID are required");
    }

    const transaction = await deleteTransactionModel(id, userId);

    if (!transaction) {
      throw new Error("Transaction not found or access denied");
    }

    return transaction;
  } catch (error) {
    console.error("Error in deleteTransactionService:", error);
    throw error;
  }
};

/**
 * Creates a quick income transaction with default values
 * @param {string} userId - User ID from authentication
 * @param {number} amount - Transaction amount (must be positive)
 * @returns {Promise<Object>} Created transaction object
 * @throws {Error} If validation fails or database error occurs
 */
export const createQuickIncomeService = async (userId, amount, description = 'Quick income entry') => {
  return createTransactionService(userId, amount, 'income', 'Income', description);
};

/**
 * Creates a quick expense transaction with default values
 * @param {string} userId - User ID from authentication
 * @param {number} amount - Transaction amount (must be positive)
 * @returns {Promise<Object>} Created transaction object
 * @throws {Error} If validation fails or database error occurs
 */
export const createQuickExpenseService = async (userId, amount, description = 'Quick expense entry') => {
  return createTransactionService(userId, amount, 'expense', 'Expense', description);
};

/**
 * Gets financial summary for a user within a date range
 * @param {string} userId - User ID from authentication
 * @param {string} dateFrom - Start date (optional)
 * @param {string} dateTo - End date (optional)
 * @returns {Promise<Object>} Summary object with totals and breakdown
 */
export const getTransactionSummaryService = async (userId, dateFrom, dateTo) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    let query = `
      SELECT
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = $1
    `;
    let values = [userId];
    let paramIndex = 2;

    if (dateFrom) {
      query += ` AND transaction_date >= $${paramIndex}`;
      values.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      query += ` AND transaction_date <= $${paramIndex}`;
      values.push(dateTo);
      paramIndex++;
    }

    query += ` GROUP BY type`;

    const result = await pool.query(query, values);

    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    result.rows.forEach(row => {
      if (row.type === 'income') {
        totalIncome = parseFloat(row.total);
        incomeCount = parseInt(row.count);
      } else if (row.type === 'expense') {
        totalExpense = parseFloat(row.total);
        expenseCount = parseInt(row.count);
      }
    });

    const balance = totalIncome - totalExpense;

    return {
      summary: {
        totalIncome,
        totalExpense,
        balance,
        transactionCount: incomeCount + expenseCount,
      },
      breakdown: {
        income: { total: totalIncome, count: incomeCount },
        expense: { total: totalExpense, count: expenseCount },
      },
      period: {
        from: dateFrom || null,
        to: dateTo || null,
      },
    };
  } catch (error) {
    console.error("Error in getTransactionSummaryService:", error);
    throw error;
  }
};

/**
 * Gets detailed daily financial summary for a user
 * @param {string} userId - User ID from authentication
 * @param {string} date - Date to get summary for (YYYY-MM-DD format)
 * @returns {Promise<Object>} Detailed daily summary with categories
 */
export const getDailyFinancialSummaryService = async (userId, date) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Get basic summary for the day
    const basicQuery = `
      SELECT
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = $1 AND DATE(transaction_date) = $2
      GROUP BY type
    `;

    const basicResult = await pool.query(basicQuery, [userId, date]);

    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    basicResult.rows.forEach(row => {
      if (row.type === 'income') {
        totalIncome = parseFloat(row.total);
        incomeCount = parseInt(row.count);
      } else if (row.type === 'expense') {
        totalExpense = parseFloat(row.total);
        expenseCount = parseInt(row.count);
      }
    });

    // Get top expense categories for the day
    const categoryQuery = `
      SELECT category, SUM(amount) as total, COUNT(*) as count
      FROM transactions
      WHERE user_id = $1 AND DATE(transaction_date) = $2 AND type = 'expense'
      GROUP BY category
      ORDER BY total DESC
      LIMIT 5
    `;

    const categoryResult = await pool.query(categoryQuery, [userId, date]);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount: incomeCount + expenseCount,
      topCategories: categoryResult.rows.map(row => ({
        category: row.category,
        total: parseFloat(row.total),
        count: parseInt(row.count)
      }))
    };
  } catch (error) {
    console.error("Error in getDailyFinancialSummaryService:", error);
    throw error;
  }
};

/**
 * Gets detailed monthly financial summary for a user
 * @param {string} userId - User ID from authentication
 * @param {number} year - Year (e.g., 2026)
 * @param {number} month - Month (1-12)
 * @returns {Promise<Object>} Detailed monthly summary with categories and comparison
 */
export const getMonthlyFinancialSummaryService = async (userId, year, month) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Calculate date range for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0); // Last day of month
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    const daysInMonth = endDate.getDate();

    // Get basic summary for the month
    const basicQuery = `
      SELECT
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = $1 
        AND transaction_date >= $2 
        AND transaction_date <= $3
      GROUP BY type
    `;

    const basicResult = await pool.query(basicQuery, [userId, startDate, endDateStr]);

    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    basicResult.rows.forEach(row => {
      if (row.type === 'income') {
        totalIncome = parseFloat(row.total);
        incomeCount = parseInt(row.count);
      } else if (row.type === 'expense') {
        totalExpense = parseFloat(row.total);
        expenseCount = parseInt(row.count);
      }
    });

    // Get top income categories
    const incomeCategoryQuery = `
      SELECT category, SUM(amount) as total, COUNT(*) as count
      FROM transactions
      WHERE user_id = $1 
        AND transaction_date >= $2 
        AND transaction_date <= $3 
        AND type = 'income'
      GROUP BY category
      ORDER BY total DESC
      LIMIT 5
    `;

    const incomeCategoryResult = await pool.query(incomeCategoryQuery, [userId, startDate, endDateStr]);

    // Get top expense categories
    const expenseCategoryQuery = `
      SELECT category, SUM(amount) as total, COUNT(*) as count
      FROM transactions
      WHERE user_id = $1 
        AND transaction_date >= $2 
        AND transaction_date <= $3 
        AND type = 'expense'
      GROUP BY category
      ORDER BY total DESC
      LIMIT 5
    `;

    const expenseCategoryResult = await pool.query(expenseCategoryQuery, [userId, startDate, endDateStr]);

    // Get last month's data for comparison
    const lastMonth = month === 1 ? 12 : month - 1;
    const lastMonthYear = month === 1 ? year - 1 : year;
    const lastMonthStart = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-01`;
    const lastMonthEnd = new Date(lastMonthYear, lastMonth, 0);
    const lastMonthEndStr = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-${String(lastMonthEnd.getDate()).padStart(2, '0')}`;

    const lastMonthQuery = `
      SELECT
        type,
        SUM(amount) as total
      FROM transactions
      WHERE user_id = $1 
        AND transaction_date >= $2 
        AND transaction_date <= $3
      GROUP BY type
    `;

    const lastMonthResult = await pool.query(lastMonthQuery, [userId, lastMonthStart, lastMonthEndStr]);

    let lastMonthExpense = 0;
    lastMonthResult.rows.forEach(row => {
      if (row.type === 'expense') {
        lastMonthExpense = parseFloat(row.total);
      }
    });

    // Calculate comparison
    let comparisonWithLastMonth = null;
    if (lastMonthExpense > 0) {
      const expenseDifference = ((totalExpense - lastMonthExpense) / lastMonthExpense) * 100;
      comparisonWithLastMonth = {
        lastMonthExpense,
        currentMonthExpense: totalExpense,
        expenseDifference
      };
    }

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount: incomeCount + expenseCount,
      avgDailyExpense: totalExpense / daysInMonth,
      topIncomeCategories: incomeCategoryResult.rows.map(row => ({
        category: row.category,
        total: parseFloat(row.total),
        count: parseInt(row.count)
      })),
      topExpenseCategories: expenseCategoryResult.rows.map(row => ({
        category: row.category,
        total: parseFloat(row.total),
        count: parseInt(row.count)
      })),
      comparisonWithLastMonth
    };
  } catch (error) {
    console.error("Error in getMonthlyFinancialSummaryService:", error);
    throw error;
  }
};

/**
 * Gets all users with telegram configured for financial notifications
 * @returns {Promise<Array>} Array of users with telegram config
 */
export const getUsersForFinancialNotification = async () => {
  try {
    const query = `
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        utc.telegram_chat_id
      FROM users u
      JOIN user_telegram_config utc ON u.id = utc.user_id
      WHERE utc.is_verified = true AND utc.is_active = true
      ORDER BY u.id
    `;

    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error("Error in getUsersForFinancialNotification:", error);
    throw error;
  }
};