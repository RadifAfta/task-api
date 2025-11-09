import { pool } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

// ============= TELEGRAM CONFIG =============

// Create or update Telegram config
export const createTelegramConfig = async (userId) => {
  const id = uuidv4();
  const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 character code
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  const result = await pool.query(
    `INSERT INTO user_telegram_config 
     (id, user_id, verification_code, verification_expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) 
     DO UPDATE SET 
       verification_code = $3,
       verification_expires_at = $4,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [id, userId, verificationCode, expiresAt]
  );
  
  return result.rows[0];
};

// Get Telegram config by user ID
export const getTelegramConfigByUser = async (userId) => {
  const result = await pool.query(
    `SELECT * FROM user_telegram_config WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0];
};

// Get Telegram config by chat ID
export const getTelegramConfigByChatId = async (chatId) => {
  const result = await pool.query(
    `SELECT * FROM user_telegram_config WHERE telegram_chat_id = $1`,
    [chatId]
  );
  return result.rows[0];
};

// Update Telegram active status
export const updateTelegramStatus = async (userId, isActive) => {
  const result = await pool.query(
    `UPDATE user_telegram_config 
     SET is_active = $2, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING *`,
    [userId, isActive]
  );
  return result.rows[0];
};

// ============= REMINDER SETTINGS =============

// Get reminder settings for user
export const getReminderSettings = async (userId) => {
  const result = await pool.query(
    `SELECT * FROM reminder_settings WHERE user_id = $1`,
    [userId]
  );
  
  // Return default if not exists
  if (result.rows.length === 0) {
    return await createDefaultReminderSettings(userId);
  }
  
  return result.rows[0];
};

// Create default reminder settings
export const createDefaultReminderSettings = async (userId) => {
  const id = uuidv4();
  
  const result = await pool.query(
    `INSERT INTO reminder_settings (id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING *`,
    [id, userId]
  );
  
  return result.rows[0] || await getReminderSettings(userId);
};

// Update reminder settings
export const updateReminderSettings = async (userId, settings) => {
  const {
    reminderBeforeMinutes,
    dailySummaryTime,
    enableTaskStartReminder,
    enableTaskDueReminder,
    enableDailySummary,
    enableRoutineGenerationNotice,
    notifyPendingTasks,
    notifyOverdueTasks,
    notifyCompletedMilestone,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd
  } = settings;

  const result = await pool.query(
    `UPDATE reminder_settings 
     SET reminder_before_minutes = COALESCE($2, reminder_before_minutes),
         daily_summary_time = COALESCE($3, daily_summary_time),
         enable_task_start_reminder = COALESCE($4, enable_task_start_reminder),
         enable_task_due_reminder = COALESCE($5, enable_task_due_reminder),
         enable_daily_summary = COALESCE($6, enable_daily_summary),
         enable_routine_generation_notice = COALESCE($7, enable_routine_generation_notice),
         notify_pending_tasks = COALESCE($8, notify_pending_tasks),
         notify_overdue_tasks = COALESCE($9, notify_overdue_tasks),
         notify_completed_milestone = COALESCE($10, notify_completed_milestone),
         quiet_hours_enabled = COALESCE($11, quiet_hours_enabled),
         quiet_hours_start = COALESCE($12, quiet_hours_start),
         quiet_hours_end = COALESCE($13, quiet_hours_end),
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING *`,
    [
      userId,
      reminderBeforeMinutes,
      dailySummaryTime,
      enableTaskStartReminder,
      enableTaskDueReminder,
      enableDailySummary,
      enableRoutineGenerationNotice,
      notifyPendingTasks,
      notifyOverdueTasks,
      notifyCompletedMilestone,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd
    ]
  );

  return result.rows[0];
};

// ============= SCHEDULED REMINDERS =============

// Create scheduled reminder
export const createScheduledReminder = async (userId, taskId, reminderType, reminderTime, minutesBefore = null) => {
  const id = uuidv4();
  
  try {
    const result = await pool.query(
      `INSERT INTO scheduled_reminders 
       (id, user_id, task_id, reminder_type, reminder_time, minutes_before)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, userId, taskId, reminderType, reminderTime, minutesBefore]
    );
    return result.rows[0];
  } catch (error) {
    // Handle unique constraint violation (duplicate reminder)
    if (error.code === '23505') {
      return null; // Already scheduled
    }
    throw error;
  }
};

// Get pending scheduled reminders
export const getPendingReminders = async (beforeTime = new Date()) => {
  const result = await pool.query(
    `SELECT sr.*, t.title, t.description, t.category, t.priority, t.time_start, t.time_end, t.due_date,
            u.name as user_name, utc.telegram_chat_id, rs.enable_task_start_reminder, rs.enable_task_due_reminder
     FROM scheduled_reminders sr
     JOIN tasks t ON sr.task_id = t.id
     JOIN users u ON sr.user_id = u.id
     LEFT JOIN user_telegram_config utc ON sr.user_id = utc.user_id
     LEFT JOIN reminder_settings rs ON sr.user_id = rs.user_id
     WHERE sr.is_sent = false
     AND sr.reminder_time <= $1
     AND utc.is_verified = true
     AND utc.is_active = true
     ORDER BY sr.reminder_time ASC
     LIMIT 100`,
    [beforeTime]
  );
  
  return result.rows;
};

// Mark reminder as sent
export const markReminderAsSent = async (reminderId) => {
  const result = await pool.query(
    `UPDATE scheduled_reminders 
     SET is_sent = true, sent_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [reminderId]
  );
  return result.rows[0];
};

// Delete scheduled reminders for task
export const deleteScheduledRemindersForTask = async (taskId) => {
  const result = await pool.query(
    `DELETE FROM scheduled_reminders WHERE task_id = $1 RETURNING *`,
    [taskId]
  );
  return result.rows;
};

// ============= NOTIFICATION LOGS =============

// Create notification log
export const createNotificationLog = async (logData) => {
  const {
    userId,
    taskId,
    notificationType,
    notificationChannel = 'telegram',
    messageTitle,
    messageBody,
    scheduledAt,
    sentAt = new Date(),
    deliveryStatus = 'sent',
    failureReason = null,
    telegramMessageId = null
  } = logData;

  const id = uuidv4();

  const result = await pool.query(
    `INSERT INTO notification_logs 
     (id, user_id, task_id, notification_type, notification_channel, message_title, message_body, 
      scheduled_at, sent_at, delivery_status, failure_reason, telegram_message_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      id, userId, taskId, notificationType, notificationChannel, messageTitle, messageBody,
      scheduledAt, sentAt, deliveryStatus, failureReason, telegramMessageId
    ]
  );

  return result.rows[0];
};

// Get notification history for user
export const getNotificationHistory = async (userId, options = {}) => {
  const { limit = 50, offset = 0, notificationType, deliveryStatus, fromDate, toDate } = options;
  
  let query = `
    SELECT nl.*, t.title as task_title
    FROM notification_logs nl
    LEFT JOIN tasks t ON nl.task_id = t.id
    WHERE nl.user_id = $1
  `;
  
  const params = [userId];
  let paramIndex = 2;
  
  if (notificationType) {
    query += ` AND nl.notification_type = $${paramIndex}`;
    params.push(notificationType);
    paramIndex++;
  }
  
  if (deliveryStatus) {
    query += ` AND nl.delivery_status = $${paramIndex}`;
    params.push(deliveryStatus);
    paramIndex++;
  }
  
  if (fromDate) {
    query += ` AND nl.created_at >= $${paramIndex}`;
    params.push(fromDate);
    paramIndex++;
  }
  
  if (toDate) {
    query += ` AND nl.created_at <= $${paramIndex}`;
    params.push(toDate);
    paramIndex++;
  }
  
  query += `
    ORDER BY nl.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  params.push(limit, offset);
  
  const result = await pool.query(query, params);
  return result.rows;
};

// Get notification statistics
export const getNotificationStats = async (userId, days = 30) => {
  const result = await pool.query(
    `SELECT 
       notification_type,
       delivery_status,
       COUNT(*) as count
     FROM notification_logs
     WHERE user_id = $1
     AND created_at >= NOW() - INTERVAL '${days} days'
     GROUP BY notification_type, delivery_status
     ORDER BY notification_type, delivery_status`,
    [userId]
  );
  
  return result.rows;
};

// ============= UTILITY FUNCTIONS =============

// Get users for daily summary (at specific time)
export const getUsersForDailySummary = async (summaryTime) => {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, utc.telegram_chat_id, rs.daily_summary_time
     FROM users u
     JOIN reminder_settings rs ON u.id = rs.user_id
     JOIN user_telegram_config utc ON u.id = utc.user_id
     WHERE rs.enable_daily_summary = true
     AND utc.is_verified = true
     AND utc.is_active = true
     AND rs.daily_summary_time = $1`,
    [summaryTime]
  );
  
  return result.rows;
};

// Check if in quiet hours
export const isInQuietHours = async (userId) => {
  const result = await pool.query(
    `SELECT quiet_hours_enabled, quiet_hours_start, quiet_hours_end
     FROM reminder_settings
     WHERE user_id = $1`,
    [userId]
  );
  
  if (result.rows.length === 0 || !result.rows[0].quiet_hours_enabled) {
    return false;
  }
  
  const { quiet_hours_start, quiet_hours_end } = result.rows[0];
  const now = new Date();
  const currentTime = now.toTimeString().split(' ')[0];
  
  // Handle quiet hours that span midnight
  if (quiet_hours_start > quiet_hours_end) {
    return currentTime >= quiet_hours_start || currentTime <= quiet_hours_end;
  } else {
    return currentTime >= quiet_hours_start && currentTime <= quiet_hours_end;
  }
};

// Get active users with telegram enabled
export const getActiveTelegramUsers = async () => {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, utc.telegram_chat_id, utc.telegram_username
     FROM users u
     JOIN user_telegram_config utc ON u.id = utc.user_id
     WHERE utc.is_verified = true
     AND utc.is_active = true`
  );
  
  return result.rows;
};

export default {
  // Telegram Config
  createTelegramConfig,
  getTelegramConfigByUser,
  getTelegramConfigByChatId,
  updateTelegramStatus,
  
  // Reminder Settings
  getReminderSettings,
  createDefaultReminderSettings,
  updateReminderSettings,
  
  // Scheduled Reminders
  createScheduledReminder,
  getPendingReminders,
  markReminderAsSent,
  deleteScheduledRemindersForTask,
  
  // Notification Logs
  createNotificationLog,
  getNotificationHistory,
  getNotificationStats,
  
  // Utilities
  getUsersForDailySummary,
  isInQuietHours,
  getActiveTelegramUsers
};