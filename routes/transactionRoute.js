import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";

import { createTransactionController, getTransactionsController, getTransactionByIdController, updateTransactionController, deleteTransactionController, getTransactionSummaryController } from "../controllers/transactionController.js";
import { validateCreateTransaction, validateUpdateTransaction } from "../middlewares/validationMiddleware.js";

const router = express.Router();


router.use(verifyToken);


/**
 * @swagger
 * tags:
 *   - name: Transactions
 *     description: Income and Expense Transaction Management
 */

/**
 * @swagger
 * /transactions:
 *   post:
 *     tags: ['Transactions']
 *     summary: Create a new transaction
 *     description: Creates a new income or expense transaction for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - amount
 *               - category
 *               - description
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *                 description: Type of transaction
 *               amount:
 *                 type: integer
 *                 minimum: 1
 *                 description: Transaction amount (positive integer)
 *               category:
 *                 type: string
 *                 maxLength: 50
 *                 description: Transaction category
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Transaction description
 *               transaction_date:
 *                 type: string
 *                 format: date
 *                 description: Transaction date (optional, defaults to today)
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     user_id:
 *                       type: string
 *                       format: uuid
 *                     type:
 *                       type: string
 *                       enum: [income, expense]
 *                     amount:
 *                       type: integer
 *                     category:
 *                       type: string
 *                     description:
 *                       type: string
 *                     transaction_date:
 *                       type: string
 *                       format: date
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /transactions:
 *   get:
 *     tags: ['Transactions']
 *     summary: Get all transactions for the authenticated user
 *     description: Retrieves a paginated list of income and expense transactions for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Page number (default 1)
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - name: limit
 *         in: query
 *         description: Number of items per page (default 10)
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       user_id:
 *                         type: string
 *                         format: uuid
 *                       type:
 *                         type: string
 *                         enum: [income, expense]
 *                       amount:
 *                         type: integer
 *                       category:
 *                         type: string
 *                       description:
 *                         type: string
 *                       transaction_date:
 *                         type: string
 *                         format: date
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     itemsPerPage:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.post("/", validateCreateTransaction, createTransactionController);

router.get("/", getTransactionsController);

/**
 * @swagger
 * /transactions/summary:
 *   get:
 *     tags: ['Transactions']
 *     summary: Get transaction summary
 *     description: Retrieves financial summary (income, expense, balance) for the authenticated user within optional date range.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: dateFrom
 *         in: query
 *         description: Start date for summary (YYYY-MM-DD)
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - name: dateTo
 *         in: query
 *         description: End date for summary (YYYY-MM-DD)
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalIncome:
 *                           type: number
 *                         totalExpense:
 *                           type: number
 *                         balance:
 *                           type: number
 *                         transactionCount:
 *                           type: integer
 *                     breakdown:
 *                       type: object
 *                       properties:
 *                         income:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: number
 *                             count:
 *                               type: integer
 *                         expense:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: number
 *                             count:
 *                               type: integer
 *                     period:
 *                       type: object
 *                       properties:
 *                         from:
 *                           type: string
 *                           format: date
 *                         to:
 *                           type: string
 *                           format: date
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get("/summary", getTransactionSummaryController);

/**
 * @swagger
 * /transactions/{id}:
 *   get:
 *     tags: ['Transactions']
 *     summary: Get a specific transaction by ID
 *     description: Retrieves a single transaction by its ID for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Transaction ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     user_id:
 *                       type: string
 *                       format: uuid
 *                     type:
 *                       type: string
 *                       enum: [income, expense]
 *                     amount:
 *                       type: integer
 *                     category:
 *                       type: string
 *                     description:
 *                       type: string
 *                     transaction_date:
 *                       type: string
 *                       format: date
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Transaction not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get("/:id", getTransactionByIdController);

/**
 * @swagger
 * /transactions/{id}:
 *   put:
 *     tags: ['Transactions']
 *     summary: Update a transaction
 *     description: Updates an existing transaction for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Transaction ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *                 description: Type of transaction
 *               amount:
 *                 type: integer
 *                 minimum: 1
 *                 description: Transaction amount (positive integer)
 *               category:
 *                 type: string
 *                 maxLength: 50
 *                 description: Transaction category
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Transaction description
 *               transaction_date:
 *                 type: string
 *                 format: date
 *                 description: Transaction date (optional)
 *     responses:
 *       200:
 *         description: Transaction updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     user_id:
 *                       type: string
 *                       format: uuid
 *                     type:
 *                       type: string
 *                       enum: [income, expense]
 *                     amount:
 *                       type: integer
 *                     category:
 *                       type: string
 *                     description:
 *                       type: string
 *                     transaction_date:
 *                       type: string
 *                       format: date
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *       404:
 *         description: Transaction not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.put("/:id", validateUpdateTransaction, updateTransactionController);

/**
 * @swagger
 * /transactions/{id}:
 *   delete:
 *     tags: ['Transactions']
 *     summary: Delete a transaction
 *     description: Deletes a transaction by its ID for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Transaction ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Transaction deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Transaction not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.delete("/:id", deleteTransactionController);

export default router;