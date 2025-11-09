import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { pool } from '../config/db.js';

dotenv.config();

let bot = null;
let isInitialized = false;

/**
 * Telegram Bot Service for LifePath Smart Reminder System
 * Handles bot communication, user verification, and notification sending
 */

// Initialize Telegram Bot
export const initializeTelegramBot = () => {
  if (isInitialized) {
    console.log('⚠️  Telegram Bot is already initialized');
    return bot;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
    console.log('💡 Get your bot token from @BotFather on Telegram');
    return null;
  }

  try {
    // Create bot instance with polling
    bot = new TelegramBot(token, { 
      polling: true,
      filepath: false // Disable file download for security
    });

    console.log('🤖 Telegram Bot initialized successfully');
    
    // Setup bot command handlers
    setupBotHandlers();
    
    isInitialized = true;
    return bot;

  } catch (error) {
    console.error('❌ Failed to initialize Telegram Bot:', error.message);
    return null;
  }
};

// Setup bot command handlers
const setupBotHandlers = () => {
  if (!bot) return;

  // /start command - Initial greeting and verification
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username || msg.from.first_name;

    const welcomeMessage = `
🌟 *Welcome to LifePath Reminder Bot!*

Hello ${username}! 👋

I'm your personal task reminder assistant. I'll help you stay on track with your daily tasks and routines.

*Two Ways to Connect:*

*Option 1: Connect from App* 📱
1. Get verification code from LifePath app
2. Use \`/verify <code>\` here to link

*Option 2: Connect from Telegram* 💬
1. Use \`/login <email>\` command
2. Enter your LifePath password when prompted
3. Get instant verification!

*Available Commands:*
/start - Show this welcome message
/login <email> - Login directly from Telegram
/verify <code> - Verify with code from app
/status - Check your connection status
/help - Get help and information

Need help? Use /help command! 💪
    `;

    await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  });

  // /login command - Login and generate code directly from Telegram
  bot.onText(/\/login (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const email = match[1].trim().toLowerCase();

    try {
      const client = await pool.connect();

      // Check if user exists
      const userResult = await client.query(
        'SELECT id, email, name, password_hash FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        await bot.sendMessage(chatId,
          '❌ *Email Not Found*\n\n' +
          `No LifePath account found with email: ${email}\n\n` +
          'Please check your email or register at the LifePath app first.',
          { parse_mode: 'Markdown' }
        );
        client.release();
        return;
      }

      const user = userResult.rows[0];

      // Ask for password
      await bot.sendMessage(chatId,
        `🔐 *Password Required*\n\n` +
        `Please send your LifePath password for ${email}\n\n` +
        `⚠️ *Security Note:* Send password in next message.\n` +
        `I'll delete it immediately after verification.`,
        { parse_mode: 'Markdown' }
      );

      // Store pending login state
      await client.query(`
        UPDATE user_telegram_config
        SET telegram_chat_id = $1,
            telegram_username = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $3
      `, [chatId, msg.from.username, user.id]);

      client.release();

      // Set up one-time message handler for password
      const passwordHandler = async (passwordMsg) => {
        if (passwordMsg.chat.id !== chatId) return;
        
        const password = passwordMsg.text;

        // Delete password message immediately
        try {
          await bot.deleteMessage(chatId, passwordMsg.message_id);
        } catch (err) {
          console.log('Could not delete password message');
        }

        try {
          const bcrypt = await import('bcryptjs');
          const isMatch = await bcrypt.default.compare(password, user.password_hash);

          if (!isMatch) {
            await bot.sendMessage(chatId,
              '❌ *Incorrect Password*\n\n' +
              'The password you entered is incorrect.\n' +
              'Please try /login again with the correct password.',
              { parse_mode: 'Markdown' }
            );
            bot.removeListener('message', passwordHandler);
            return;
          }

          // Password correct - auto-verify user
          const client2 = await pool.connect();

          await client2.query(`
            UPDATE user_telegram_config
            SET telegram_chat_id = $1,
                telegram_username = $2,
                is_verified = true,
                is_active = true,
                verification_code = NULL,
                verification_expires_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $3
          `, [chatId, msg.from.username, user.id]);

          // Create default reminder settings if not exists
          await client2.query(`
            INSERT INTO reminder_settings (user_id)
            VALUES ($1)
            ON CONFLICT (user_id) DO NOTHING
          `, [user.id]);

          client2.release();

          const successMessage = `
✅ *Login Successful!*

Welcome ${user.name}! 🎉

Your Telegram is now connected to LifePath.

*You'll receive:*
• ⏰ Task reminders before start time
• 📊 Daily task summaries
• 🎯 Routine generation notices
• ⚠️ Overdue task alerts

*What's Next?*
• Use /status to check settings
• Configure preferences in LifePath app
• Start creating tasks and get reminders!

Let's make your day productive! 💪
          `;

          await bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });

        } catch (error) {
          console.error('Error in password verification:', error);
          await bot.sendMessage(chatId,
            '❌ An error occurred during login. Please try again.',
            { parse_mode: 'Markdown' }
          );
        }

        // Remove this one-time handler
        bot.removeListener('message', passwordHandler);
      };

      // Add one-time password handler
      bot.once('message', passwordHandler);

    } catch (error) {
      console.error('Error in login command:', error);
      await bot.sendMessage(chatId,
        '❌ An error occurred. Please try again.',
        { parse_mode: 'Markdown' }
      );
    }
  });

  // /verify command - Verify user with code
  bot.onText(/\/verify (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    const verificationCode = match[1].trim().toUpperCase();

    try {
      const client = await pool.connect();

      // Find user with this verification code
      const result = await client.query(`
        SELECT utc.*, u.email, u.name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.verification_code = $1
        AND utc.is_verified = false
        AND utc.verification_expires_at > NOW()
      `, [verificationCode]);

      if (result.rows.length === 0) {
        await bot.sendMessage(chatId, 
          '❌ *Verification Failed*\n\n' +
          'Invalid or expired verification code.\n' +
          'Please get a new code from the LifePath app.',
          { parse_mode: 'Markdown' }
        );
        client.release();
        return;
      }

      const userConfig = result.rows[0];

      // Update telegram config with verified status
      await client.query(`
        UPDATE user_telegram_config
        SET telegram_chat_id = $1,
            telegram_username = $2,
            is_verified = true,
            is_active = true,
            verification_code = NULL,
            verification_expires_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $3
      `, [chatId, username, userConfig.user_id]);

      client.release();

      const successMessage = `
✅ *Verification Successful!*

Welcome aboard, ${userConfig.name}! 🎉

Your Telegram account is now linked to LifePath.

*What's Next?*
• Configure your reminder preferences in the app
• I'll send you reminders before your tasks start
• Get daily summaries of your tasks
• Receive notifications when routines are generated

*Quick Tips:*
• Use /status to check your connection
• Use /help for more information
• Manage settings in the LifePath app

Let's make your day productive! 💪
      `;

      await bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Error in verification:', error);
      await bot.sendMessage(chatId, 
        '❌ An error occurred during verification. Please try again.',
        { parse_mode: 'Markdown' }
      );
    }
  });

  // /status command - Check connection status
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const client = await pool.connect();

      const result = await client.query(`
        SELECT utc.*, u.name, u.email, rs.*
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        LEFT JOIN reminder_settings rs ON utc.user_id = rs.user_id
        WHERE utc.telegram_chat_id = $1
      `, [chatId]);

      client.release();

      if (result.rows.length === 0) {
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Your Telegram account is not linked to LifePath.\n' +
          'Use /verify <code> to connect your account.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const config = result.rows[0];

      const statusMessage = `
✅ *Connection Status*

*Account:* ${config.name}
*Email:* ${config.email}
*Verified:* ${config.is_verified ? '✅ Yes' : '❌ No'}
*Active:* ${config.is_active ? '✅ Active' : '⏸️  Paused'}

*Reminder Settings:*
• Task Start Reminders: ${config.enable_task_start_reminder ? '✅' : '❌'}
• Task Due Reminders: ${config.enable_task_due_reminder ? '✅' : '❌'}
• Daily Summary: ${config.enable_daily_summary ? '✅' : '❌'}
• Routine Notices: ${config.enable_routine_generation_notice ? '✅' : '❌'}

*Quiet Hours:* ${config.quiet_hours_enabled ? `🌙 ${config.quiet_hours_start} - ${config.quiet_hours_end}` : '❌ Disabled'}

Manage your settings in the LifePath app! 📱
      `;

      await bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Error checking status:', error);
      await bot.sendMessage(chatId, '❌ Error checking status. Please try again.');
    }
  });

  // /help command - Show help information
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;

    const helpMessage = `
📚 *LifePath Reminder Bot Help*

*Available Commands:*
/start - Welcome message and setup guide
/login <email> - Login directly from Telegram
/verify <code> - Link with code from app
/status - Check your connection and settings
/help - Show this help message

*Connection Methods:*

*Method 1: Quick Login from Telegram* 🚀
1. \`/login your-email@example.com\`
2. Send your password when prompted
3. Instantly connected!

*Method 2: Verify with App Code* 📱
1. Generate code in LifePath app
2. \`/verify ABC123\` with your code
3. Connected!

*About Reminders:*
• Get notified before your tasks start
• Receive daily task summaries
• Get alerts for overdue tasks
• Notifications for routine generation

*Customization:*
• Set reminder timing (15, 30, 60 minutes before)
• Choose daily summary time
• Enable/disable specific notification types
• Set quiet hours (no notifications)

*Settings Management:*
All reminder preferences can be configured in the LifePath app under Settings → Reminders.

*Need Support?*
Contact: your-email@example.com

*Pro Tips:* 💡
• Keep notifications enabled for best experience
• Set quiet hours for undisturbed sleep
• Adjust reminder timing to match your workflow
• Use daily summaries for morning planning

Stay productive! 🚀
    `;

    await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  });

  // Handle polling errors
  bot.on('polling_error', (error) => {
    console.error('Telegram Bot polling error:', error.message);
  });

  // Handle any message (optional - for future expansion)
  bot.on('message', async (msg) => {
    // Log all messages for monitoring
    console.log(`📨 Message from ${msg.from.username || msg.from.first_name}: ${msg.text}`);
  });

  console.log('✅ Telegram Bot command handlers registered');
};

// Send task reminder notification
export const sendTaskReminder = async (chatId, task, minutesBefore) => {
  if (!bot) {
    console.error('❌ Telegram Bot not initialized');
    return { success: false, error: 'Bot not initialized' };
  }

  try {
    const emoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
    const categoryEmoji = task.category === 'work' ? '💼' : task.category === 'learn' ? '📚' : '🧘';

    const message = `
${emoji} *Task Reminder*

${categoryEmoji} *${task.title}*
${task.description ? `\n_${task.description}_` : ''}

⏰ *Starts in ${minutesBefore} minutes*
🕐 *Time:* ${task.time_start} - ${task.time_end || 'No end time'}
📊 *Priority:* ${task.priority.toUpperCase()}
📁 *Category:* ${task.category}

Get ready to be productive! 💪
    `;

    const result = await bot.sendMessage(chatId, message, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Mark as Done', callback_data: `task_done_${task.id}` },
          { text: '⏰ Snooze 10min', callback_data: `task_snooze_${task.id}` }
        ]]
      }
    });

    return { 
      success: true, 
      messageId: result.message_id 
    };

  } catch (error) {
    console.error('Error sending task reminder:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// Send daily summary
export const sendDailySummary = async (chatId, userName, tasks) => {
  if (!bot) {
    console.error('❌ Telegram Bot not initialized');
    return { success: false, error: 'Bot not initialized' };
  }

  try {
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const completedTasks = tasks.filter(t => t.status === 'done');

    let message = `
🌅 *Good Morning, ${userName}!*

Here's your daily task summary for *${new Date().toLocaleDateString()}*

📊 *Task Overview:*
• Pending: ${pendingTasks.length}
• In Progress: ${inProgressTasks.length}
• Completed: ${completedTasks.length}
• *Total:* ${tasks.length}

`;

    if (pendingTasks.length > 0) {
      message += '\n📋 *Today\'s Pending Tasks:*\n';
      pendingTasks.slice(0, 5).forEach((task, idx) => {
        const emoji = task.category === 'work' ? '💼' : task.category === 'learn' ? '📚' : '🧘';
        const timeInfo = task.time_start ? ` (${task.time_start})` : '';
        message += `${idx + 1}. ${emoji} ${task.title}${timeInfo}\n`;
      });
      if (pendingTasks.length > 5) {
        message += `\n_...and ${pendingTasks.length - 5} more tasks_\n`;
      }
    }

    message += '\nMake today count! 💪🚀';

    const result = await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    return { 
      success: true, 
      messageId: result.message_id 
    };

  } catch (error) {
    console.error('Error sending daily summary:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// Send routine generation notice
export const sendRoutineGenerationNotice = async (chatId, routineName, tasksCount) => {
  if (!bot) {
    console.error('❌ Telegram Bot not initialized');
    return { success: false, error: 'Bot not initialized' };
  }

  try {
    const message = `
🗓️ *Routine Generated*

Your routine "*${routineName}*" has been generated!

✅ *${tasksCount} tasks* have been added to your task list for today.

Check your LifePath app to get started! 📱
    `;

    const result = await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    return { 
      success: true, 
      messageId: result.message_id 
    };

  } catch (error) {
    console.error('Error sending routine notice:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// Send overdue task alert
export const sendOverdueAlert = async (chatId, task) => {
  if (!bot) {
    console.error('❌ Telegram Bot not initialized');
    return { success: false, error: 'Bot not initialized' };
  }

  try {
    const message = `
⚠️ *Task Overdue*

*${task.title}* is overdue!

📅 *Due Date:* ${task.due_date}
📊 *Priority:* ${task.priority.toUpperCase()}

Don't forget to complete it! ⏰
    `;

    const result = await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    return { 
      success: true, 
      messageId: result.message_id 
    };

  } catch (error) {
    console.error('Error sending overdue alert:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// Get bot instance
export const getBot = () => bot;

// Check if bot is initialized
export const isBotInitialized = () => isInitialized;

// Shutdown bot gracefully
export const shutdownTelegramBot = () => {
  if (bot && isInitialized) {
    console.log('🔄 Shutting down Telegram Bot...');
    bot.stopPolling();
    isInitialized = false;
    console.log('✅ Telegram Bot shutdown completed');
  }
};

export default {
  initializeTelegramBot,
  sendTaskReminder,
  sendDailySummary,
  sendRoutineGenerationNotice,
  sendOverdueAlert,
  getBot,
  isBotInitialized,
  shutdownTelegramBot
};