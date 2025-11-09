import express from 'express';
import * as reminderController from '../controllers/reminderController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Telegram
 *   description: Telegram Bot Integration & Connection Management
 */

/**
 * @swagger
 * /telegram/config:
 *   get:
 *     summary: Get telegram configuration
 *     description: Get current telegram bot connection status
 *     tags: [Telegram]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Telegram configuration retrieved
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
 *                     telegram_user_id:
 *                       type: string
 *                     telegram_username:
 *                       type: string
 *                     is_verified:
 *                       type: boolean
 *                     is_active:
 *                       type: boolean
 *       404:
 *         description: Configuration not found
 */
router.get('/config', verifyToken, reminderController.getTelegramConfig);

/**
 * @swagger
 * /telegram/connect:
 *   post:
 *     summary: Generate verification code (Web)
 *     description: Generate verification code from web app to connect telegram bot
 *     tags: [Telegram]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification code generated
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
 *                     verification_code:
 *                       type: string
 *                       example: "ABC123"
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *                     instructions:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Already connected
 */
router.post('/connect', verifyToken, reminderController.initiateTelegramConnection);

/**
 * @swagger
 * /telegram/disconnect:
 *   post:
 *     summary: Disconnect telegram
 *     description: Deactivate telegram bot notifications
 *     tags: [Telegram]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Telegram disconnected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post('/disconnect', verifyToken, reminderController.disconnectTelegram);

/**
 * @swagger
 * /telegram/test:
 *   post:
 *     summary: Send test notification
 *     description: Send a test notification to telegram to verify setup
 *     tags: [Telegram]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test notification sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 telegram_message_id:
 *                   type: integer
 *       400:
 *         description: Telegram not configured
 */
router.post('/test', verifyToken, reminderController.testReminder);

export default router;