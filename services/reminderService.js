import pool from '../config/db.js';
import * as reminderModel from '../models/reminderModel.js';
import * as taskModel from '../models/taskModel.js';
import * as telegramService from './telegramService.js';
import moment from 'moment-timezone';

/**
 * Smart Reminder Service
 * Handles reminder logic, scheduling, and notification sending
 */

// Schedule reminders for a task
export const scheduleRemindersForTask = async (task) => {
  try {
    const userId = task.user_id;
    
    // Get user's reminder settings
    const settings = await reminderModel.getReminderSettings(userId);
    
    if (!settings || !settings.enable_task_start_reminder) {
      return { success: false, message: 'Task start reminders disabled' };
    }
    
    // Check if user has telegram configured
    const telegramConfig = await reminderModel.getTelegramConfigByUser(userId);
    if (!telegramConfig || !telegramConfig.is_verified || !telegramConfig.is_active) {
      return { success: false, message: 'Telegram not configured' };
    }
    
    // Only schedule reminders for tasks with start time
    if (!task.time_start) {
      return { success: false, message: 'Task has no start time' };
    }
    
    const scheduledReminders = [];
    const reminderMinutes = settings.reminder_before_minutes || [15, 30, 60];
    
    // Create task datetime from due_date and time_start
    const taskDate = task.due_date || moment().tz('Asia/Jakarta').format('YYYY-MM-DD');
    const taskDateTime = new Date(`${taskDate}T${task.time_start}`);
    
    // Schedule reminder for each configured time
    for (const minutesBefore of reminderMinutes) {
      const reminderTime = new Date(taskDateTime.getTime() - minutesBefore * 60 * 1000);
      
      // Only schedule if reminder time is in the future
      if (reminderTime > moment().tz('Asia/Jakarta').toDate()) {
        const reminder = await reminderModel.createScheduledReminder(
          userId,
          task.id,
          'task_start',
          reminderTime,
          minutesBefore
        );
        
        if (reminder) {
          scheduledReminders.push(reminder);
        }
      }
    }
    
    return {
      success: true,
      scheduledCount: scheduledReminders.length,
      reminders: scheduledReminders
    };
    
  } catch (error) {
    console.error('Error scheduling reminders:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Schedule reminders for due date
export const scheduleDueReminder = async (task) => {
  try {
    const userId = task.user_id;
    
    // Get user's reminder settings
    const settings = await reminderModel.getReminderSettings(userId);
    
    if (!settings || !settings.enable_task_due_reminder) {
      return { success: false, message: 'Due date reminders disabled' };
    }
    
    // Only schedule if task has due date
    if (!task.due_date) {
      return { success: false, message: 'Task has no due date' };
    }
    
    const dueDateTime = new Date(task.due_date);
    const reminderTime = new Date(dueDateTime.getTime() - 24 * 60 * 60 * 1000); // 1 day before
    
    // Only schedule if reminder time is in the future
    if (reminderTime > moment().tz('Asia/Jakarta').toDate()) {
      const reminder = await reminderModel.createScheduledReminder(
        userId,
        task.id,
        'task_due',
        reminderTime,
        1440 // 1 day = 1440 minutes
      );
      
      return {
        success: true,
        reminder
      };
    }
    
    return { success: false, message: 'Due date is too soon' };
    
  } catch (error) {
    console.error('Error scheduling due reminder:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Process and send pending reminders
export const processPendingReminders = async () => {
  try {
    console.log('🔔 Processing pending reminders...');
    
    const now = moment().tz('Asia/Jakarta').toDate();
    const pendingReminders = await reminderModel.getPendingReminders(now);
    
    if (pendingReminders.length === 0) {
      console.log('   No pending reminders at this time');
      return {
        success: true,
        processed: 0,
        sent: 0,
        failed: 0
      };
    }
    
    console.log(`   Found ${pendingReminders.length} pending reminders`);
    
    let sent = 0;
    let failed = 0;
    
    for (const reminder of pendingReminders) {
      try {
        // Check if in quiet hours
        const inQuietHours = await reminderModel.isInQuietHours(reminder.user_id);
        
        if (inQuietHours) {
          console.log(`   Skipping reminder for ${reminder.user_name} (quiet hours)`);
          // Mark as sent but skip
          await reminderModel.markReminderAsSent(reminder.id);
          
          await reminderModel.createNotificationLog({
            userId: reminder.user_id,
            taskId: reminder.task_id,
            notificationType: reminder.reminder_type,
            messageTitle: `Reminder: ${reminder.title}`,
            messageBody: 'Skipped due to quiet hours',
            scheduledAt: reminder.reminder_time,
            deliveryStatus: 'skipped',
            failureReason: 'Quiet hours enabled'
          });
          
          continue;
        }
        
        // Send reminder based on type
        let result;
        if (reminder.reminder_type === 'task_start') {
          result = await telegramService.sendTaskReminder(
            reminder.telegram_chat_id,
            {
              id: reminder.task_id,
              title: reminder.title,
              description: reminder.description,
              category: reminder.category,
              priority: reminder.priority,
              time_start: reminder.time_start,
              time_end: reminder.time_end
            },
            reminder.minutes_before
          );
        } else if (reminder.reminder_type === 'task_due') {
          result = await telegramService.sendOverdueAlert(
            reminder.telegram_chat_id,
            {
              id: reminder.task_id,
              title: reminder.title,
              priority: reminder.priority,
              due_date: reminder.due_date
            }
          );
        }
        
        if (result.success) {
          // Mark reminder as sent
          await reminderModel.markReminderAsSent(reminder.id);
          
          // Log successful notification
          await reminderModel.createNotificationLog({
            userId: reminder.user_id,
            taskId: reminder.task_id,
            notificationType: reminder.reminder_type,
            messageTitle: `Reminder: ${reminder.title}`,
            messageBody: `Sent ${reminder.minutes_before} minutes before`,
            scheduledAt: reminder.reminder_time,
            sentAt: moment().tz('Asia/Jakarta').toDate(),
            deliveryStatus: 'sent',
            telegramMessageId: result.messageId
          });
          
          sent++;
          console.log(`   ✅ Sent reminder to ${reminder.user_name} for "${reminder.title}"`);
        } else {
          failed++;
          
          // Log failed notification
          await reminderModel.createNotificationLog({
            userId: reminder.user_id,
            taskId: reminder.task_id,
            notificationType: reminder.reminder_type,
            messageTitle: `Reminder: ${reminder.title}`,
            messageBody: 'Failed to send',
            scheduledAt: reminder.reminder_time,
            deliveryStatus: 'failed',
            failureReason: result.error
          });
          
          console.error(`   ❌ Failed to send reminder: ${result.error}`);
        }
        
      } catch (error) {
        console.error(`   Error processing reminder ${reminder.id}:`, error);
        failed++;
      }
    }
    
    console.log(`🔔 Reminder processing complete: ${sent} sent, ${failed} failed`);
    
    return {
      success: true,
      processed: pendingReminders.length,
      sent,
      failed
    };
    
  } catch (error) {
    console.error('Error processing pending reminders:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send daily summary to users
export const sendDailySummaries = async () => {
  try {
    console.log('📊 Sending daily summaries...');
    
    // Get current time (hour:minute)
    const now = moment().tz('Asia/Jakarta');
    const currentTime = now.format('HH:mm:ss');
    
    const users = await reminderModel.getUsersForDailySummary(currentTime);
    
    if (users.length === 0) {
      console.log('   No users scheduled for daily summary at this time');
      return {
        success: true,
        sent: 0
      };
    }
    
    console.log(`   Found ${users.length} users for daily summary`);
    
    let sent = 0;
    let failed = 0;
    
    for (const user of users) {
      try {
        // Get today's tasks for user
        const today = moment().tz('Asia/Jakarta').format('YYYY-MM-DD');
        const tasks = await taskModel.getTasksByUser(user.id, {
          limit: 100,
          offset: 0
        });
        
        // Filter tasks for today
        const todayTasks = tasks.filter(task => {
          return task.due_date === today || 
                 (task.time_start && task.due_date === today);
        });
        
        if (todayTasks.length === 0) {
          console.log(`   No tasks for ${user.name}, skipping summary`);
          continue;
        }
        
        const result = await telegramService.sendDailySummary(
          user.telegram_chat_id,
          user.name,
          todayTasks
        );
        
        if (result.success) {
          sent++;
          
          // Log notification
          await reminderModel.createNotificationLog({
            userId: user.id,
            taskId: null,
            notificationType: 'daily_summary',
            messageTitle: 'Daily Task Summary',
            messageBody: `Summary for ${todayTasks.length} tasks`,
            scheduledAt: now,
            sentAt: new Date(),
            deliveryStatus: 'sent',
            telegramMessageId: result.messageId
          });
          
          console.log(`   ✅ Sent daily summary to ${user.name}`);
        } else {
          failed++;
          console.error(`   ❌ Failed to send summary to ${user.name}: ${result.error}`);
        }
        
      } catch (error) {
        console.error(`   Error sending summary to ${user.name}:`, error);
        failed++;
      }
    }
    
    console.log(`📊 Daily summary complete: ${sent} sent, ${failed} failed`);
    
    return {
      success: true,
      sent,
      failed
    };
    
  } catch (error) {
    console.error('Error sending daily summaries:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Notify about routine generation
export const notifyRoutineGeneration = async (userId, routineName, tasksCount) => {
  try {
    const settings = await reminderModel.getReminderSettings(userId);
    
    if (!settings || !settings.enable_routine_generation_notice) {
      return { success: false, message: 'Routine notices disabled' };
    }
    
    const telegramConfig = await reminderModel.getTelegramConfigByUser(userId);
    if (!telegramConfig || !telegramConfig.is_verified || !telegramConfig.is_active) {
      return { success: false, message: 'Telegram not configured' };
    }
    
    const result = await telegramService.sendRoutineGenerationNotice(
      telegramConfig.telegram_chat_id,
      routineName,
      tasksCount
    );
    
    if (result.success) {
      // Log notification
      await reminderModel.createNotificationLog({
        userId,
        taskId: null,
        notificationType: 'routine_generated',
        messageTitle: 'Routine Generated',
        messageBody: `${routineName}: ${tasksCount} tasks`,
        scheduledAt: new Date(),
        sentAt: new Date(),
        deliveryStatus: 'sent',
        telegramMessageId: result.messageId
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('Error notifying routine generation:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Check for overdue tasks and send alerts
export const checkOverdueTasks = async () => {
  try {
    console.log('⚠️  Checking overdue tasks...');
    
    const client = await pool.connect();
    
    // Get tasks that are overdue (due date in past, status not done)
    const result = await client.query(`
      SELECT t.*, u.name as user_name, utc.telegram_chat_id, rs.notify_overdue_tasks
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      JOIN user_telegram_config utc ON t.user_id = utc.user_id
      JOIN reminder_settings rs ON t.user_id = rs.user_id
      WHERE t.due_date < CURRENT_DATE
      AND t.status != 'done'
      AND utc.is_verified = true
      AND utc.is_active = true
      AND rs.notify_overdue_tasks = true
      AND NOT EXISTS (
        SELECT 1 FROM notification_logs nl
        WHERE nl.task_id = t.id
        AND nl.notification_type = 'overdue'
        AND nl.created_at > NOW() - INTERVAL '24 hours'
      )
      LIMIT 50
    `);
    
    client.release();
    
    const overdueTasks = result.rows;
    
    if (overdueTasks.length === 0) {
      console.log('   No new overdue tasks');
      return { success: true, sent: 0 };
    }
    
    console.log(`   Found ${overdueTasks.length} overdue tasks`);
    
    let sent = 0;
    
    for (const task of overdueTasks) {
      try {
        const alertResult = await telegramService.sendOverdueAlert(
          task.telegram_chat_id,
          task
        );
        
        if (alertResult.success) {
          sent++;
          
          await reminderModel.createNotificationLog({
            userId: task.user_id,
            taskId: task.id,
            notificationType: 'overdue',
            messageTitle: 'Task Overdue',
            messageBody: task.title,
            scheduledAt: new Date(),
            sentAt: new Date(),
            deliveryStatus: 'sent',
            telegramMessageId: alertResult.messageId
          });
          
          console.log(`   ✅ Sent overdue alert for "${task.title}"`);
        }
        
      } catch (error) {
        console.error(`   Error sending overdue alert for task ${task.id}:`, error);
      }
    }
    
    console.log(`⚠️  Overdue check complete: ${sent} alerts sent`);
    
    return {
      success: true,
      sent
    };
    
  } catch (error) {
    console.error('Error checking overdue tasks:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  scheduleRemindersForTask,
  scheduleDueReminder,
  processPendingReminders,
  sendDailySummaries,
  notifyRoutineGeneration,
  checkOverdueTasks
};