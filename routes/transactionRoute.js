import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";

import { createTransactionController } from "../controllers/transactionController.js";
import { validateCreateTransaction } from "../middlewares/validationMiddleware.js";

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

router.post("/", validateCreateTransaction, createTransactionController);

export default router;