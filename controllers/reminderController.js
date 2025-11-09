import { validationResult } from 'express-validator';
import * as reminderModel from '../models/reminderModel.js';
import * as reminderService from '../services/reminderService.js';
import * as telegramService from '../services/telegramService.js';

/**
 * Reminder Controller
 * Handles reminder configuration and telegram integration
 */

// Get telegram configuration
export const getTelegramConfig = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const config = await reminderModel.getTelegramConfigByUser(userId);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Telegram configuration not found'
      });
    }
    
    // Remove sensitive data
    const { telegram_user_id, telegram_username, is_verified, is_active, created_at, updated_at } = config;
    
    res.status(200).json({
      success: true,
      data: {
        telegram_user_id,
        telegram_username,
        is_verified,
        is_active,
        created_at,
        updated_at
      }
    });
    
  } catch (error) {
    console.error('Error getting telegram config:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Initialize telegram connection
export const initiateTelegramConnection = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if already configured
    const existing = await reminderModel.getTelegramConfigByUser(userId);
    if (existing && existing.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'Telegram already configured. Please disconnect first if you want to reconnect.'
      });
    }
    
    // Create or update config
    const config = await reminderModel.createTelegramConfig(userId);
    
    if (!config) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate verification code'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Verification code generated',
      data: {
        verification_code: config.verification_code,
        expires_at: config.verification_expires_at,
        instructions: [
          '1. Open Telegram and search for your LifePath bot',
          '2. Send /start command to the bot',
          `3. Send /verify ${config.verification_code}`,
          '4. Wait for confirmation',
          '5. Come back here to check status'
        ]
      }
    });
    
  } catch (error) {
    console.error('Error initiating telegram connection:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Disconnect telegram
export const disconnectTelegram = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await reminderModel.updateTelegramConfigStatus(userId, false);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Telegram configuration not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Telegram disconnected successfully'
    });
    
  } catch (error) {
    console.error('Error disconnecting telegram:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get reminder settings
export const getReminderSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    
    let settings = await reminderModel.getReminderSettings(userId);
    
    // Create default settings if not exists
    if (!settings) {
      settings = await reminderModel.createDefaultReminderSettings(userId);
    }
    
    res.status(200).json({
      success: true,
      data: settings
    });
    
  } catch (error) {
    console.error('Error getting reminder settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update reminder settings
export const updateReminderSettings = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    
    const userId = req.user.id;
    const updates = req.body;
    
    // Ensure user has settings
    let settings = await reminderModel.getReminderSettings(userId);
    if (!settings) {
      settings = await reminderModel.createDefaultReminderSettings(userId);
    }
    
    // Update settings
    const updated = await reminderModel.updateReminderSettings(userId, updates);
    
    if (!updated) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update settings'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Reminder settings updated successfully',
      data: updated
    });
    
  } catch (error) {
    console.error('Error updating reminder settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get notification history
export const getNotificationHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;
    
    const history = await reminderModel.getNotificationHistory(
      userId,
      parseInt(limit),
      parseInt(offset)
    );
    
    res.status(200).json({
      success: true,
      data: history,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: history.length
      }
    });
    
  } catch (error) {
    console.error('Error getting notification history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get notification statistics
export const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;
    
    const stats = await reminderModel.getNotificationStats(userId, parseInt(days));
    
    res.status(200).json({
      success: true,
      data: {
        period_days: parseInt(days),
        statistics: stats
      }
    });
    
  } catch (error) {
    console.error('Error getting notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get pending scheduled reminders
export const getPendingReminders = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const reminders = await reminderModel.getScheduledRemindersByUser(userId);
    
    res.status(200).json({
      success: true,
      data: reminders,
      count: reminders.length
    });
    
  } catch (error) {
    console.error('Error getting pending reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Test reminder (send test notification)
export const testReminder = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check telegram config
    const config = await reminderModel.getTelegramConfigByUser(userId);
    
    if (!config || !config.is_verified || !config.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Telegram not configured or not verified. Please set up telegram first.'
      });
    }
    
    // Get user name from telegram config or use telegram username
    const userName = config.telegram_username || req.user.email.split('@')[0];
    
    // Send test message
    const result = await telegramService.bot.sendMessage(
      config.telegram_chat_id,
      `🧪 *Test Notification*\n\nHi ${userName}! Your LifePath reminder system is working perfectly! ✅\n\nYou'll receive notifications for:\n• Task reminders\n• Daily summaries\n• Routine generation\n• Overdue alerts`,
      { parse_mode: 'Markdown' }
    );
    
    // Log notification
    await reminderModel.createNotificationLog({
      userId,
      taskId: null,
      notificationType: 'test',
      messageTitle: 'Test Notification',
      messageBody: 'System test successful',
      scheduledAt: new Date(),
      sentAt: new Date(),
      deliveryStatus: 'sent',
      telegramMessageId: result.message_id
    });
    
    res.status(200).json({
      success: true,
      message: 'Test notification sent successfully',
      telegram_message_id: result.message_id
    });
    
  } catch (error) {
    console.error('Error sending test reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
};

// Manual trigger: Process pending reminders
export const triggerReminderProcessing = async (req, res) => {
  try {
    // Only allow admin to trigger manually
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    const result = await reminderService.processPendingReminders();
    
    res.status(200).json({
      success: true,
      message: 'Reminder processing triggered',
      result
    });
    
  } catch (error) {
    console.error('Error triggering reminder processing:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Manual trigger: Send daily summaries
export const triggerDailySummaries = async (req, res) => {
  try {
    // Only allow admin to trigger manually
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    const result = await reminderService.sendDailySummaries();
    
    res.status(200).json({
      success: true,
      message: 'Daily summaries triggered',
      result
    });
    
  } catch (error) {
    console.error('Error triggering daily summaries:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Manual trigger: Check overdue tasks
export const triggerOverdueCheck = async (req, res) => {
  try {
    // Only allow admin to trigger manually
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    const result = await reminderService.checkOverdueTasks();
    
    res.status(200).json({
      success: true,
      message: 'Overdue check triggered',
      result
    });
    
  } catch (error) {
    console.error('Error triggering overdue check:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export default {
  getTelegramConfig,
  initiateTelegramConnection,
  disconnectTelegram,
  getReminderSettings,
  updateReminderSettings,
  getNotificationHistory,
  getNotificationStats,
  getPendingReminders,
  testReminder,
  triggerReminderProcessing,
  triggerDailySummaries,
  triggerOverdueCheck
};