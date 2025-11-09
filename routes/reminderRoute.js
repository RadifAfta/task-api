import express from 'express';
import * as reminderController from '../controllers/reminderController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { body } from 'express-validator';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reminders
 *   description: Smart Reminder Settings & Notification Management
 */

/**
 * @swagger
 * /reminders/settings:
 *   get:
 *     summary: Get reminder settings
 *     description: Get reminder preferences for authenticated user
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reminder settings retrieved
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
 *                     enable_task_start_reminder:
 *                       type: boolean
 *                     enable_task_due_reminder:
 *                       type: boolean
 *                     enable_daily_summary:
 *                       type: boolean
 *                     enable_routine_generation_notice:
 *                       type: boolean
 *                     reminder_before_minutes:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     daily_summary_time:
 *                       type: string
 *                     quiet_hours_enabled:
 *                       type: boolean
 *                     quiet_hours_start:
 *                       type: string
 *                     quiet_hours_end:
 *                       type: string
 */
router.get('/settings', verifyToken, reminderController.getReminderSettings);

/**
 * @swagger
 * /reminders/settings:
 *   put:
 *     summary: Update reminder settings
 *     description: Update reminder preferences
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enable_task_start_reminder:
 *                 type: boolean
 *               enable_task_due_reminder:
 *                 type: boolean
 *               enable_daily_summary:
 *                 type: boolean
 *               enable_routine_generation_notice:
 *                 type: boolean
 *               notify_overdue_tasks:
 *                 type: boolean
 *               reminder_before_minutes:
 *                 type: array
 *                 items:
 *                   type: integer
 *               daily_summary_time:
 *                 type: string
 *                 pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$'
 *               quiet_hours_enabled:
 *                 type: boolean
 *               quiet_hours_start:
 *                 type: string
 *                 pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$'
 *               quiet_hours_end:
 *                 type: string
 *                 pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$'
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put('/settings', 
  verifyToken,
  [
    body('enable_task_start_reminder').optional().isBoolean(),
    body('enable_task_due_reminder').optional().isBoolean(),
    body('enable_daily_summary').optional().isBoolean(),
    body('enable_routine_generation_notice').optional().isBoolean(),
    body('notify_overdue_tasks').optional().isBoolean(),
    body('reminder_before_minutes').optional().isArray(),
    body('reminder_before_minutes.*').optional().isInt({ min: 1 }),
    body('daily_summary_time').optional().matches(/^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
    body('quiet_hours_enabled').optional().isBoolean(),
    body('quiet_hours_start').optional().matches(/^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
    body('quiet_hours_end').optional().matches(/^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
  ],
  reminderController.updateReminderSettings
);

/**
 * @swagger
 * /reminders/history:
 *   get:
 *     summary: Get notification history
 *     description: Get history of sent notifications
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Notification history retrieved
 */
router.get('/history', verifyToken, reminderController.getNotificationHistory);

/**
 * @swagger
 * /reminders/stats:
 *   get:
 *     summary: Get notification statistics
 *     description: Get statistics of notifications sent
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Statistics retrieved
 */
router.get('/stats', verifyToken, reminderController.getNotificationStats);

/**
 * @swagger
 * /reminders/pending:
 *   get:
 *     summary: Get pending scheduled reminders
 *     description: Get list of upcoming scheduled reminders
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending reminders retrieved
 */
router.get('/pending', verifyToken, reminderController.getPendingReminders);

/**
 * @swagger
 * /reminders/trigger/process:
 *   post:
 *     summary: Manual trigger - Process pending reminders
 *     description: Manually trigger processing of pending reminders (Admin only)
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Processing triggered
 *       403:
 *         description: Admin access required
 */
router.post('/trigger/process', verifyToken, reminderController.triggerReminderProcessing);

/**
 * @swagger
 * /reminders/trigger/summaries:
 *   post:
 *     summary: Manual trigger - Send daily summaries
 *     description: Manually trigger daily summary sending (Admin only)
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Summaries triggered
 *       403:
 *         description: Admin access required
 */
router.post('/trigger/summaries', verifyToken, reminderController.triggerDailySummaries);

/**
 * @swagger
 * /reminders/trigger/overdue:
 *   post:
 *     summary: Manual trigger - Check overdue tasks
 *     description: Manually trigger overdue task checking (Admin only)
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue check triggered
 *       403:
 *         description: Admin access required
 */
router.post('/trigger/overdue', verifyToken, reminderController.triggerOverdueCheck);

export default router;