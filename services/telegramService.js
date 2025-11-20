import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { pool } from '../config/db.js';

dotenv.config();

let bot = null;
let isInitialized = false;

// Store user states for multi-step commands
const userStates = new Map();
// Map to indicate that the next interactive /addtask for a chat should be attached to a routine
const routineAttachMap = new Map();

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
    
    // Set bot commands menu
    setupBotCommands();
    
    // Setup bot command handlers
    setupBotHandlers();
    
    isInitialized = true;
    return bot;

  } catch (error) {
    console.error('❌ Failed to initialize Telegram Bot:', error.message);
    return null;
  }
};

// Setup bot commands menu (appears in Telegram menu)
const setupBotCommands = async () => {
  if (!bot) return;

    try {
    await bot.setMyCommands([
      { command: 'start', description: '🌟 Welcome message & setup guide' },
      { command: 'login', description: '🔐 Login with email & password' },
      { command: 'verify', description: '✅ Verify with code from app' },
      { command: 'quick', description: '⚡ Quick task actions' },
      { command: 'addtask', description: '➕ Add task (interactive)' },
      { command: 'addroutine', description: '📋 Add routine (interactive)' },
      { command: 'managetasks', description: '🛠️ Manage your tasks (edit/delete)' },
      { command: 'manageroutines', description: '🛠️ Manage your routines (edit/delete)' },
      { command: 'mytasks', description: '📋 My tasks with actions' },
      { command: 'today', description: '📅 View today\'s tasks' },
      { command: 'complete', description: '✅ Mark task as done' },
      { command: 'myroutines', description: '📋 View my routines' },
      { command: 'status', description: '� Check connection & settings' },
      { command: 'menu', description: '📋 Show command menu' }
    ]);

    console.log('✅ Telegram Bot command menu registered');
  } catch (error) {
    console.error('❌ Failed to set bot commands:', error);
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

*What You Can Do:*
• ➕ Add tasks with \`/addtask\`
• 📅 View today's tasks with \`/today\`
• ⏰ Get automatic task reminders
• 📊 Receive daily summaries
• 🎯 Track your progress

*Quick Commands:*
Tap any button below or type the command:
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '➕ Add Task', callback_data: 'cmd_addtask' },
          { text: '📅 Today\'s Tasks', callback_data: 'cmd_today' }
        ],
        [
          { text: '🔐 Login', callback_data: 'cmd_login' },
          { text: '📊 Status', callback_data: 'cmd_status' }
        ],
        [
          { text: '📚 Help', callback_data: 'cmd_help' },
          { text: '📋 Menu', callback_data: 'cmd_menu' }
        ]
      ]
    };

    await bot.sendMessage(chatId, welcomeMessage, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  });

  // /menu command - Show command menu with buttons
  bot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;

    const menuMessage = `
📋 *LifePath Bot Commands*

Select a command below or type it manually:

*Connection:*
• \`/login <email>\` - Login with email & password
• \`/verify <code>\` - Verify with app code

*Tasks:*
• \`/addtask\` - Add new task
• \`/today\` - View today's tasks

*Routines:*
• \`/myroutines\` - View routine templates
• \`/generateroutine\` - Generate daily routine

*Information:*
• \`/status\` - Check connection status
• \`/help\` - Get help & documentation

*Quick Actions:*
Use the buttons below for quick access! 👇
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '➕ Add Task', callback_data: 'cmd_addtask' },
          { text: '📅 Today\'s Tasks', callback_data: 'cmd_today' }
        ],
        [
          { text: '📋 My Routines', callback_data: 'cmd_myroutines' },
          { text: '🔄 Generate All', callback_data: 'generate_all_routines' }
        ],
        [
          { text: '🔐 Login Guide', callback_data: 'guide_login' },
          { text: '✅ Verify Guide', callback_data: 'guide_verify' }
        ],
        [
          { text: '📊 Check Status', callback_data: 'cmd_status' },
          { text: '📚 Help', callback_data: 'cmd_help' }
        ],
        [
          { text: '🔄 Refresh Menu', callback_data: 'cmd_menu' }
        ]
      ]
    };

    await bot.sendMessage(chatId, menuMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
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
/menu - Show command menu with buttons
/login <email> - Login directly from Telegram
/verify <code> - Link with code from app
/addtask - Add a new task
/today - View today's tasks
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

*Task Management:*

*Add Task* ➕
Use \`/addtask\` and follow the format:
\`Title | Description | Priority | Category\`

Example:
\`Team Meeting | Discuss Q4 goals | high | work\`

*View Today's Tasks* 📅
Use \`/today\` to see all tasks for today, organized by status (pending, in progress, completed).

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

*Quick Access:*
Use \`/menu\` command to see all available commands with clickable buttons! 📋

*Need Support?*
Contact: your-email@example.com

*Pro Tips:* 💡
• Keep notifications enabled for best experience
• Set quiet hours for undisturbed sleep
• Adjust reminder timing to match your workflow
• Use daily summaries for morning planning
• Use /addtask for quick task creation
• Check /today regularly to stay on track

Stay productive! 🚀
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '➕ Add Task', callback_data: 'cmd_addtask' },
          { text: '📅 Today\'s Tasks', callback_data: 'cmd_today' }
        ],
        [
          { text: '📋 Show Menu', callback_data: 'cmd_menu' },
          { text: '📊 Check Status', callback_data: 'cmd_status' }
        ],
        [
          { text: '🔐 Login Guide', callback_data: 'guide_login' },
          { text: '✅ Verify Guide', callback_data: 'guide_verify' }
        ]
      ]
    };

    await bot.sendMessage(chatId, helpMessage, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  });

  // /addtaskraw command - Add new task (advanced/raw format)
  bot.onText(/\/addtaskraw(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const taskDetails = match[1]; // Text after /addtaskraw (if any)
    
    console.log(`📝 /addtaskraw command received from ${msg.from.username || msg.from.first_name} (${chatId})`);
    console.log(`📋 Task details in command: "${taskDetails}"`);

    try {
      const client = await pool.connect();

      // Check if user is verified
      const result = await client.query(`
        SELECT utc.user_id, u.name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
      `, [chatId]);

      client.release();

      console.log(`🔍 User verification result:`, result.rows);

      if (result.rows.length === 0) {
        console.log(`❌ User not verified for chatId: ${chatId}`);
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Please connect your Telegram account first using /verify or /login',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = result.rows[0];
      console.log(`✅ User verified: ${user.name} (${user.user_id})`);

      // If task details provided in command, process immediately
      if (taskDetails && taskDetails.trim()) {
        console.log(`⚡ Processing task immediately: "${taskDetails}"`);
        await handleTaskInput(chatId, taskDetails.trim(), user.user_id, user.name);
        return;
      }

      // Otherwise, set user state to await task input
      userStates.set(chatId, {
        action: 'awaiting_task_input',
        userId: user.user_id,
        userName: user.name
      });
      
      console.log(`💾 State saved for ${chatId}:`, userStates.get(chatId));
      console.log(`📊 Total states in memory:`, userStates.size);

      const addTaskMessage = `
➕ *Add New Task*

Please send your task details in this format:

\`Title | Description | Priority | Category | TimeStart | TimeEnd\`

*Examples:*
\`Team Meeting | Discuss Q4 goals | high | work | 09:00 | 10:00\`
\`Study Python | Complete chapter 5 | medium | learn | 14:30 | 16:00\`
\`Meditation | Morning routine | low | rest | 06:00 | 06:30\`

*Fields:*
• *Title* (required)
• *Description* (optional)
• *Priority:* high, medium, low (optional, default: medium)
• *Category:* work, learn, rest (optional, default: work)
• *TimeStart* (required for reminders) - format: HH:MM (24-hour)
• *TimeEnd* (optional) - format: HH:MM (24-hour)

*Minimal format with time:*
\`Team Meeting | | | | 09:00 | 10:00\`

*Or use directly:*
\`/addtaskraw Meeting | Discuss goals | high | work | 09:00 | 10:00\`

⚠️ *Note:* TimeStart is required to enable task reminders!
      `;

      await bot.sendMessage(chatId, addTaskMessage, { parse_mode: 'Markdown' });
      console.log(`📤 Instructions sent to user ${chatId}`);

    } catch (error) {
      console.error('❌ Error in addtask command:', error);
      console.error('Stack trace:', error.stack);
      await bot.sendMessage(chatId, `❌ Error processing request: ${error.message}\n\nPlease try again.`);
      userStates.delete(chatId);
    }
  });

  // /quickadd command - Interactive task creation (NO SYMBOLS NEEDED!)
  bot.onText(/\/quickadd/, async (msg) => {
    const chatId = msg.chat.id;

    console.log(`➕ /quickadd command received from ${msg.from.username || msg.from.first_name} (${chatId})`);

    try {
      const client = await pool.connect();

      const result = await client.query(`
        SELECT utc.user_id, u.name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
      `, [chatId]);

      client.release();

      if (result.rows.length === 0) {
        await bot.sendMessage(chatId,
          '❌ Please connect first using /login or /verify',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = result.rows[0];

      // Set state for interactive input
      userStates.set(chatId, {
        action: 'awaiting_interactive_task',
        step: 'title',
        userId: user.user_id,
        userName: user.name,
        taskData: {}
      });

      await bot.sendMessage(chatId,
        '➕ *Quick Add Task* (Interactive Mode)\n\n' +
        '📝 *Step 1/6:* What is the task title?\n\n' +
        'Just type the task name, no symbols needed!\n\n' +
        '*Example:* Team Meeting\n\n' +
        'Or /cancel to abort.',
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('Error in quickadd command:', error);
      await bot.sendMessage(chatId, '❌ Error. Please try again.');
    }
  });

  // /addtask now maps to the interactive quick add (keeps backward-friendly main command)
  bot.onText(/\/addtask(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    // If user provided inline details (rare), pass them to quickadd handler via processUpdate
    const fakeMsg = {
      chat: { id: chatId },
      from: msg.from,
      message_id: Date.now()
    };

    // Trigger interactive quickadd flow
    bot.processUpdate({
      update_id: Date.now(),
      message: {
        ...fakeMsg,
        date: Math.floor(Date.now() / 1000),
        text: '/quickadd'
      }
    });
  });

  // /addroutine maps to the interactive quick routine command
  bot.onText(/\/addroutine/, async (msg) => {
    const chatId = msg.chat.id;
    const fakeMsg = {
      chat: { id: chatId },
      from: msg.from,
      message_id: Date.now()
    };

    bot.processUpdate({
      update_id: Date.now(),
      message: {
        ...fakeMsg,
        date: Math.floor(Date.now() / 1000),
        text: '/quickroutine'
      }
    });
  });

  // /today command - View today's tasks
  bot.onText(/\/today/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const client = await pool.connect();

      // Check if user is verified
      const result = await client.query(`
        SELECT utc.user_id, u.name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
      `, [chatId]);

      if (result.rows.length === 0) {
        client.release();
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Please connect your Telegram account first using /verify or /login',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = result.rows[0];

      // Get today's tasks
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const tasksResult = await client.query(`
        SELECT * FROM tasks
        WHERE user_id = $1
        AND (
          DATE(created_at) = $2
          OR DATE(due_date) = $2
          OR (due_date IS NULL AND status != 'done')
        )
        ORDER BY 
          CASE priority
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
          END,
          time_start ASC,
          created_at DESC
      `, [user.user_id, todayStr]);

      client.release();

      const tasks = tasksResult.rows;

      if (tasks.length === 0) {
        await bot.sendMessage(chatId,
          '📅 *Today\'s Tasks*\n\n' +
          '🎉 No tasks for today!\n\n' +
          'Use /addtask to create a new task.',
          { 
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '➕ Add Task', callback_data: 'cmd_addtask' }
              ]]
            }
          }
        );
        return;
      }

      // Group tasks by status
      const pendingTasks = tasks.filter(t => t.status === 'pending');
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
      const completedTasks = tasks.filter(t => t.status === 'done');

      let message = `
📅 *Today's Tasks* - ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}

📊 *Overview:*
• Pending: ${pendingTasks.length}
• In Progress: ${inProgressTasks.length}
• Completed: ${completedTasks.length}
• *Total:* ${tasks.length}
`;

      // Show pending tasks
      if (pendingTasks.length > 0) {
        message += '\n📋 *PENDING TASKS:*\n';
        pendingTasks.forEach((task, idx) => {
          const emoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
          const categoryEmoji = task.category === 'work' ? '💼' : task.category === 'learn' ? '📚' : '🧘';
          const timeInfo = task.time_start ? ` ⏰ ${task.time_start}` : '';
          message += `\n${idx + 1}. ${emoji} ${categoryEmoji} *${task.title}*${timeInfo}`;
          if (task.description && task.description.length > 0) {
            message += `\n   _${task.description.substring(0, 50)}${task.description.length > 50 ? '...' : ''}_`;
          }
        });
      }

      // Show in-progress tasks
      if (inProgressTasks.length > 0) {
        message += '\n\n🔄 *IN PROGRESS:*\n';
        inProgressTasks.forEach((task, idx) => {
          const categoryEmoji = task.category === 'work' ? '💼' : task.category === 'learn' ? '📚' : '🧘';
          message += `\n${idx + 1}. ${categoryEmoji} *${task.title}*`;
        });
      }

      // Show completed tasks
      if (completedTasks.length > 0) {
        message += '\n\n✅ *COMPLETED:*\n';
        completedTasks.forEach((task, idx) => {
          message += `\n${idx + 1}. ~~${task.title}~~`;
        });
      }

      message += '\n\n💪 Keep up the great work!';

      await bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '➕ Add Task', callback_data: 'cmd_addtask' },
            { text: '🔄 Refresh', callback_data: 'cmd_today' }
          ]]
        }
      });

    } catch (error) {
      console.error('Error in today command:', error);
      await bot.sendMessage(chatId, '❌ Error fetching tasks. Please try again.');
    }
  });

  // /managetasks - Quick manager for editing/deleting tasks (compact list)
  bot.onText(/\/managetasks/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const client = await pool.connect();

      const result = await client.query(`
        SELECT utc.user_id, u.name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
      `, [chatId]);

      if (result.rows.length === 0) {
        client.release();
        await bot.sendMessage(chatId, '❌ Please connect first using /login or /verify', { parse_mode: 'Markdown' });
        return;
      }

      const user = result.rows[0];

      const tasksResult = await client.query(`
        SELECT id, title, priority, category, time_start, status
        FROM tasks
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 20
      `, [user.user_id]);

      client.release();

      if (tasksResult.rows.length === 0) {
        await bot.sendMessage(chatId, '📋 No tasks found. Use /addtask to create one.', { parse_mode: 'Markdown' });
        return;
      }

      // Build a compact list with edit/delete buttons
      for (const task of tasksResult.rows) {
        const emoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
        const timeInfo = task.time_start ? ` ⏰ ${task.time_start}` : '';
        const text = `${emoji} *${task.title}*${timeInfo}\n_${task.category} | ${task.status}_`;

        await bot.sendMessage(chatId, text, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✏️ Edit', callback_data: `task_edit_${task.id}` },
              { text: '🗑️ Delete', callback_data: `task_delete_${task.id}` }
            ]]
          }
        });
      }

    } catch (error) {
      console.error('Error in managetasks command:', error);
      await bot.sendMessage(chatId, '❌ Error fetching tasks. Please try again.');
    }
  });

  // /manageroutines - Manage routine templates (edit / delete)
  bot.onText(/\/manageroutines/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const client = await pool.connect();

      const result = await client.query(`
        SELECT utc.user_id, u.name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
      `, [chatId]);

      if (result.rows.length === 0) {
        client.release();
        await bot.sendMessage(chatId, '❌ Please connect first using /login or /verify', { parse_mode: 'Markdown' });
        return;
      }

      const user = result.rows[0];

      // Load routines via model
      const routineModel = await import('../models/routineModel.js');
      const routines = await routineModel.getRoutineTemplatesByUser(user.user_id, { isActive: null, limit: 50 });

      client.release();

      if (!routines || routines.length === 0) {
        await bot.sendMessage(chatId, '📋 No routines found. Use /createroutine to add one.', { parse_mode: 'Markdown' });
        return;
      }

      for (const routine of routines) {
        const text = `📋 *${routine.name}*\n_${routine.description || '(no description)'}_\nID: \`${routine.id}\``;
        await bot.sendMessage(chatId, text, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✏️ Edit', callback_data: `routine_edit_${routine.id}` },
              { text: '🗑️ Delete', callback_data: `routine_delete_${routine.id}` },
              { text: '➕ Add Task', callback_data: `add_task_routine_${routine.id}` }
            ]]
          }
        });
      }

    } catch (error) {
      console.error('Error in manageroutines command:', error);
      await bot.sendMessage(chatId, '❌ Error fetching routines. Please try again.');
    }
  });

  // /mytasks command - My tasks with quick actions (OPTIMIZED)
  bot.onText(/\/mytasks/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const client = await pool.connect();

      // Check if user is verified
      const result = await client.query(`
        SELECT utc.user_id, u.name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
      `, [chatId]);

      if (result.rows.length === 0) {
        client.release();
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Please connect your Telegram account first using /verify or /login',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = result.rows[0];

      // Get active tasks (not completed)
      const tasksResult = await client.query(`
        SELECT * FROM tasks
        WHERE user_id = $1
        AND status != 'done'
        ORDER BY 
          CASE priority
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
          END,
          time_start ASC NULLS LAST,
          created_at DESC
        LIMIT 15
      `, [user.user_id]);

      client.release();

      const tasks = tasksResult.rows;

      if (tasks.length === 0) {
        await bot.sendMessage(chatId,
          '📋 *My Tasks*\n\n' +
          '✨ No active tasks!\n\n' +
          'Tap button below to add your first task.',
          { 
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '➕ Add New Task', callback_data: 'cmd_addtask' }
              ]]
            }
          }
        );
        return;
      }

      // Send each task with action buttons
      const intro = `📋 *My Active Tasks* (${tasks.length})\n\n` +
                   `Tap action buttons below each task:\n` +
                   `✅ Complete | ✏️ Edit | 🗑️ Delete`;

      await bot.sendMessage(chatId, intro, { parse_mode: 'Markdown' });

      // Send individual task cards with buttons
      for (const task of tasks.slice(0, 10)) { // Limit to 10 to avoid spam
        const emoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
        const categoryEmoji = task.category === 'work' ? '💼' : task.category === 'learn' ? '📚' : '🧘';
        const statusEmoji = task.status === 'in_progress' ? '🔄' : '📋';
        const timeInfo = task.time_start ? `⏰ ${task.time_start}${task.time_end ? `-${task.time_end}` : ''}` : '';

        const taskMessage = `
${statusEmoji} ${emoji} ${categoryEmoji} *${task.title}*
${task.description ? `_${task.description.substring(0, 80)}${task.description.length > 80 ? '...' : ''}_\n` : ''}
📊 ${task.priority} | 📁 ${task.category}${timeInfo ? ` | ${timeInfo}` : ''}
        `.trim();

        const keyboard = {
          inline_keyboard: [[
            { text: '✅ Done', callback_data: `task_complete_${task.id}` },
            { text: '✏️ Edit', callback_data: `task_edit_${task.id}` },
            { text: '🗑️ Delete', callback_data: `task_delete_${task.id}` }
          ]]
        };

        await bot.sendMessage(chatId, taskMessage, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }

      if (tasks.length > 10) {
        await bot.sendMessage(chatId, 
          `_... and ${tasks.length - 10} more tasks_\n\n` +
          `Use /today to see all tasks`,
          { parse_mode: 'Markdown' }
        );
      }

    } catch (error) {
      console.error('Error in mytasks command:', error);
      await bot.sendMessage(chatId, '❌ Error fetching tasks. Please try again.');
    }
  });

  // /quick command - Quick task actions menu (OPTIMIZED)
  bot.onText(/\/quick(?:\s|$)/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const client = await pool.connect();

      // Check if user is verified
      const result = await client.query(`
        SELECT utc.user_id, u.name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
      `, [chatId]);

      if (result.rows.length === 0) {
        client.release();
        await bot.sendMessage(chatId,
          '❌ Please connect first using /login or /verify',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = result.rows[0];

      // Get pending tasks count
      const countResult = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'done' AND DATE(updated_at) = CURRENT_DATE) as done_today
        FROM tasks
        WHERE user_id = $1
      `, [user.user_id]);

      client.release();

      const counts = countResult.rows[0];

      const message = `
⚡ *Quick Actions*

*Your Tasks Today:*
📋 Pending: ${counts.pending}
🔄 In Progress: ${counts.in_progress}
✅ Completed: ${counts.done_today}

*What would you like to do?*
      `;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '➕ Add Task', callback_data: 'cmd_addtask' },
            { text: '📋 My Tasks', callback_data: 'cmd_mytasks' }
          ],
          [
            { text: '✅ Complete Task', callback_data: 'cmd_complete' },
            { text: '📅 Today\'s View', callback_data: 'cmd_today' }
          ],
          [
            { text: '📊 Task Templates', callback_data: 'show_templates' },
            { text: '🔄 Routines', callback_data: 'cmd_myroutines' }
          ]
        ]
      };

      await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error in quick command:', error);
      await bot.sendMessage(chatId, '❌ Error. Please try again.');
    }
  });

  // /complete command - Quick complete task (OPTIMIZED)
  bot.onText(/\/complete(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const taskId = match[1]?.trim();

    try {
      const client = await pool.connect();

      // Check if user is verified
      const result = await client.query(`
        SELECT utc.user_id, u.name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
      `, [chatId]);

      if (result.rows.length === 0) {
        client.release();
        await bot.sendMessage(chatId, '❌ Please connect first using /login or /verify');
        return;
      }

      const user = result.rows[0];

      // If no task ID, show incomplete tasks
      if (!taskId) {
        const tasksResult = await client.query(`
          SELECT id, title, priority, category, time_start, status
          FROM tasks
          WHERE user_id = $1 AND status != 'done'
          ORDER BY 
            CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
            time_start ASC NULLS LAST
          LIMIT 10
        `, [user.user_id]);

        client.release();

        if (tasksResult.rows.length === 0) {
          await bot.sendMessage(chatId,
            '✅ *All Done!*\n\nYou have no pending tasks.',
            { parse_mode: 'Markdown' }
          );
          return;
        }

        let message = '✅ *Mark as Complete*\n\nSelect a task:\n\n';

        const buttons = tasksResult.rows.map(task => {
          const emoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
          const timeInfo = task.time_start ? ` ${task.time_start}` : '';
          return [{
            text: `${emoji} ${task.title}${timeInfo}`,
            callback_data: `task_complete_${task.id}`
          }];
        });

        await bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        });
        return;
      }

      // Mark specific task as complete
      const updateResult = await client.query(`
        UPDATE tasks
        SET status = 'done', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [taskId, user.user_id]);

      client.release();

      if (updateResult.rows.length === 0) {
        await bot.sendMessage(chatId, '❌ Task not found');
        return;
      }

      const task = updateResult.rows[0];
      await bot.sendMessage(chatId,
        `✅ *Task Completed!*\n\n` +
        `~~${task.title}~~\n\n` +
        `Great job! 🎉`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('Error in complete command:', error);
      await bot.sendMessage(chatId, '❌ Error. Please try again.');
    }
  });

  // /edittask command - Edit existing task
  bot.onText(/\/edittask(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const taskId = match[1]?.trim();
    
    console.log(`✏️ /edittask command received from ${msg.from.username || msg.from.first_name} (${chatId})`);
    console.log(`📋 Task ID: "${taskId}"`);

    try {
      const client = await pool.connect();

      // Check if user is verified
      const result = await client.query(`
        SELECT utc.user_id, u.name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
      `, [chatId]);

      if (result.rows.length === 0) {
        client.release();
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Please connect your Telegram account first using /verify or /login',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = result.rows[0];

      // If no task ID provided, show recent tasks
      if (!taskId) {
        const tasksResult = await client.query(`
          SELECT id, title, status, priority, category, time_start, time_end
          FROM tasks
          WHERE user_id = $1
          AND status != 'done'
          ORDER BY 
            CASE priority
              WHEN 'high' THEN 1
              WHEN 'medium' THEN 2
              WHEN 'low' THEN 3
            END,
            created_at DESC
          LIMIT 10
        `, [user.user_id]);

        client.release();

        if (tasksResult.rows.length === 0) {
          await bot.sendMessage(chatId,
            '✏️ *Edit Task*\n\n' +
            '❌ You don\'t have any active tasks to edit.\n\n' +
            'Use /addtask to create a new task.',
            { parse_mode: 'Markdown' }
          );
          return;
        }

        let message = `
✏️ *Edit Task*

Select a task to edit, or use:
/edittask <task-id>

*Recent Active Tasks:*
`;

        tasksResult.rows.forEach((task, idx) => {
          const emoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
          const categoryEmoji = task.category === 'work' ? '💼' : task.category === 'learn' ? '📚' : '🧘';
          const timeInfo = task.time_start ? ` ⏰ ${task.time_start}` : '';
          message += `\n${idx + 1}. ${emoji} ${categoryEmoji} ${task.title}${timeInfo}`;
          message += `\n   ID: ${task.id}\n`;
        });

        message += '\n💡 Copy the task ID and use: /edittask <task-id>';

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        return;
      }

      // Verify task exists and belongs to user
      const taskResult = await client.query(`
        SELECT * FROM tasks
        WHERE id = $1 AND user_id = $2
      `, [taskId, user.user_id]);

      client.release();

      if (taskResult.rows.length === 0) {
        await bot.sendMessage(chatId,
          '❌ *Task Not Found*\n\n' +
          'This task doesn\'t exist or doesn\'t belong to you.\n\n' +
          'Use /edittask to see your tasks.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const task = taskResult.rows[0];

      // Set state for task editing
      userStates.set(chatId, {
        action: 'awaiting_task_edit',
        userId: user.user_id,
        userName: user.name,
        taskId: taskId,
        currentTask: task
      });

      const message = `
✏️ *Edit Task*

*Current Task Details:*
📝 *Title:* ${task.title}
📄 *Description:* ${task.description || '(none)'}
📊 *Priority:* ${task.priority}
📁 *Category:* ${task.category}
⏰ *Time:* ${task.time_start || '(none)'}${task.time_end ? ` - ${task.time_end}` : ''}
📊 *Status:* ${task.status}

*Format for Updates:*
Title | Description | Priority | Category | TimeStart | TimeEnd | Status

*Examples:*
Updated Meeting | New description | high | work | 10:00 | 11:00 | pending
Study Session | Chapter 6 | medium | learn | 15:00 | 17:00 | in\\_progress

*Fields:*
• Title: Task name (required)
• Description: Task details (optional)
• Priority: high/medium/low (default: ${task.priority})
• Category: work/learn/rest (default: ${task.category})
• TimeStart: Start time HH:MM (default: ${task.time_start || 'none'})
• TimeEnd: End time HH:MM (default: ${task.time_end || 'none'})
• Status: pending/in\\_progress/done (default: ${task.status})

💡 *Tip:* Leave fields empty to keep current values
Example: New Title | | | | | |  (Only changes title)

Send your updates now, or /cancel to abort.
      `;

      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Error in edittask command:', error);
      await bot.sendMessage(chatId, '❌ Error. Please try again.');
    }
  });

  // /deletetask command - Delete task
  bot.onText(/\/deletetask(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const taskId = match[1]?.trim();
    
    console.log(`🗑️ /deletetask command received from ${msg.from.username || msg.from.first_name} (${chatId})`);
    console.log(`📋 Task ID: "${taskId}"`);

    try {
      const client = await pool.connect();

      // Check if user is verified
      const result = await client.query(`
        SELECT utc.user_id, u.name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
      `, [chatId]);

      if (result.rows.length === 0) {
        client.release();
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Please connect your Telegram account first using /verify or /login',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = result.rows[0];

      // If no task ID provided, show recent tasks
      if (!taskId) {
        const tasksResult = await client.query(`
          SELECT id, title, status, priority, category, time_start
          FROM tasks
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 10
        `, [user.user_id]);

        client.release();

        if (tasksResult.rows.length === 0) {
          await bot.sendMessage(chatId,
            '🗑️ *Delete Task*\n\n' +
            '❌ You don\'t have any tasks to delete.\n\n' +
            'Use /addtask to create a new task.',
            { parse_mode: 'Markdown' }
          );
          return;
        }

        let message = `
🗑️ *Delete Task*

Select a task to delete, or use:
/deletetask <task-id>

*Recent Tasks:*
`;

        tasksResult.rows.forEach((task, idx) => {
          const emoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
          const categoryEmoji = task.category === 'work' ? '💼' : task.category === 'learn' ? '📚' : '🧘';
          const statusEmoji = task.status === 'done' ? '✅' : task.status === 'in_progress' ? '🔄' : '📋';
          const timeInfo = task.time_start ? ` ⏰ ${task.time_start}` : '';
          message += `\n${idx + 1}. ${statusEmoji} ${emoji} ${categoryEmoji} ${task.title}${timeInfo}`;
          message += `\n   ID: ${task.id}\n`;
        });

        message += '\n⚠️ *Warning:* Deletion is permanent and cannot be undone!\n';
        message += '\n💡 Copy the task ID and use: /deletetask <task-id>';

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        return;
      }

      // Verify task exists and belongs to user
      const taskResult = await client.query(`
        SELECT * FROM tasks
        WHERE id = $1 AND user_id = $2
      `, [taskId, user.user_id]);

      if (taskResult.rows.length === 0) {
        client.release();
        await bot.sendMessage(chatId,
          '❌ *Task Not Found*\n\n' +
          'This task doesn\'t exist or doesn\'t belong to you.\n\n' +
          'Use /deletetask to see your tasks.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const task = taskResult.rows[0];

      // Delete the task
      await client.query(`
        DELETE FROM tasks
        WHERE id = $1 AND user_id = $2
      `, [taskId, user.user_id]);

      client.release();

      const successMessage = `
✅ *Task Deleted Successfully!*

🗑️ Deleted task: *${task.title}*
${task.description ? `_${task.description}_\n` : ''}
📊 Priority: ${task.priority}
📁 Category: ${task.category}

The task has been permanently removed from your list.

Use /today to see your remaining tasks.
      `;

      await bot.sendMessage(chatId, successMessage, { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '➕ Add Task', callback_data: 'cmd_addtask' },
            { text: '📅 Today\'s Tasks', callback_data: 'cmd_today' }
          ]]
        }
      });

    } catch (error) {
      console.error('Error in deletetask command:', error);
      await bot.sendMessage(chatId, '❌ Error deleting task. Please try again.');
    }
  });

  // /myroutines command - View user's routine templates
  bot.onText(/\/myroutines/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`📋 /myroutines command received from ${msg.from.username || msg.from.first_name} (${chatId})`);

    try {
      const client = await pool.connect();

      // Check if user is verified
      const result = await client.query(`
        SELECT utc.user_id, u.name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
      `, [chatId]);

      if (result.rows.length === 0) {
        client.release();
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Please connect your Telegram account first using /verify or /login',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = result.rows[0];

      // Get user's routine templates
      const routinesResult = await client.query(`
        SELECT rt.*, 
               COUNT(rtt.id) as tasks_count,
               CASE 
                 WHEN COUNT(rtt.id) > 0 THEN true 
                 ELSE false 
               END as has_tasks
        FROM routine_templates rt
        LEFT JOIN routine_template_tasks rtt ON rt.id = rtt.routine_template_id AND rtt.is_active = true
        WHERE rt.user_id = $1
        GROUP BY rt.id
        ORDER BY rt.is_active DESC, rt.created_at DESC
      `, [user.user_id]);

      client.release();

      const routines = routinesResult.rows;

      if (routines.length === 0) {
        await bot.sendMessage(chatId,
          '📋 *My Routines*\n\n' +
          '🎯 You don\'t have any routine templates yet.\n\n' +
          'Create your first routine template in the LifePath app to get started!',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const activeRoutines = routines.filter(r => r.is_active);
      const inactiveRoutines = routines.filter(r => !r.is_active);

      let message = `
📋 *My Routine Templates*

You have ${routines.length} routine template${routines.length > 1 ? 's' : ''}
`;

      if (activeRoutines.length > 0) {
        message += '\n\n✅ *ACTIVE ROUTINES:*\n';
        activeRoutines.forEach((routine, idx) => {
          message += `\n${idx + 1}. *${routine.name}*`;
          if (routine.description) {
            message += `\n   _${routine.description.substring(0, 50)}${routine.description.length > 50 ? '...' : ''}_`;
          }
          message += `\n   📝 ${routine.tasks_count} tasks`;
          message += `\n   ID: \`${routine.id}\`\n`;
        });
      }

      if (inactiveRoutines.length > 0) {
        message += '\n\n⏸️  *INACTIVE ROUTINES:*\n';
        inactiveRoutines.forEach((routine, idx) => {
          message += `\n${idx + 1}. ${routine.name} (${routine.tasks_count} tasks)`;
        });
      }

      message += '\n\n💡 *Tip:* Use `/generateroutine <routine-id>` to generate tasks from a routine!';

      const keyboard = {
        inline_keyboard: [[
          { text: '🔄 Generate All Routines', callback_data: 'generate_all_routines' },
          { text: '🔄 Refresh', callback_data: 'cmd_myroutines' }
        ]]
      };

      await bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error in myroutines command:', error);
      await bot.sendMessage(chatId, '❌ Error fetching routines. Please try again.');
    }
  });

  // /generateroutine command - Generate tasks from routine template
  bot.onText(/\/generateroutine(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const routineId = match[1]?.trim();
    
    console.log(`🔄 /generateroutine command received from ${msg.from.username || msg.from.first_name} (${chatId})`);
    console.log(`📋 Routine ID: "${routineId}"`);

    try {
      const client = await pool.connect();

      // Check if user is verified
      const result = await client.query(`
        SELECT utc.user_id, u.name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
      `, [chatId]);

      if (result.rows.length === 0) {
        client.release();
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Please connect your Telegram account first using /verify or /login',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = result.rows[0];

      // If no routine ID provided, show available routines
      if (!routineId) {
        const routinesResult = await client.query(`
          SELECT rt.id, rt.name, rt.description, rt.is_active,
                 COUNT(rtt.id) as tasks_count
          FROM routine_templates rt
          LEFT JOIN routine_template_tasks rtt ON rt.id = rtt.routine_template_id AND rtt.is_active = true
          WHERE rt.user_id = $1 AND rt.is_active = true
          GROUP BY rt.id
          ORDER BY rt.created_at DESC
        `, [user.user_id]);

        client.release();

        if (routinesResult.rows.length === 0) {
          await bot.sendMessage(chatId,
            '🔄 *Generate Routine*\n\n' +
            '❌ You don\'t have any active routine templates.\n\n' +
            'Create a routine template in the LifePath app first!',
            { 
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[
                  { text: '📋 View My Routines', callback_data: 'cmd_myroutines' }
                ]]
              }
            }
          );
          return;
        }

        let message = `
🔄 *Generate Routine*

Select a routine to generate, or use:
\`/generateroutine <routine-id>\`

*Available Routines:*
`;

        routinesResult.rows.forEach((routine, idx) => {
          message += `\n${idx + 1}. *${routine.name}* (${routine.tasks_count} tasks)`;
          message += `\n   ID: \`${routine.id}\`\n`;
        });

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        return;
      }

      // Generate tasks from specific routine
      const routineService = await import('./routineService.js');
      
      console.log(`🔄 Generating routine ${routineId} for user ${user.user_id}`);
      const generationResult = await routineService.generateDailyTasksFromTemplate(user.user_id, routineId);

      client.release();

      if (!generationResult.success) {
        await bot.sendMessage(chatId,
          `⚠️ *Generation Skipped*\n\n${generationResult.message}`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const routine = generationResult.routineTemplate;
      const successMessage = `
✅ *Routine Generated Successfully!*

📋 *${routine.name}*
${routine.description ? `_${routine.description}_\n` : ''}
📅 *Date:* ${generationResult.generationDate}
✅ *Tasks Created:* ${generationResult.tasksGenerated}

Your daily tasks have been generated! 🎉

Use /today to see all your tasks for today.
      `;

      await bot.sendMessage(chatId, successMessage, { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '📅 View Today\'s Tasks', callback_data: 'cmd_today' },
            { text: '📋 My Routines', callback_data: 'cmd_myroutines' }
          ]]
        }
      });

    } catch (error) {
      console.error('Error in generateroutine command:', error);
      await bot.sendMessage(chatId, `❌ Failed to generate routine: ${error.message}\n\nPlease try again.`);
    }
  });

  // /createroutine command - Create new routine template
  bot.onText(/\/createroutine/, async (msg) => {
    const chatId = msg.chat.id;
    
    console.log(`📋 /createroutine command received from ${msg.from.username || msg.from.first_name} (${chatId})`);

    try {
      const client = await pool.connect();

      // Check if user is verified
      const result = await client.query(`
        SELECT utc.user_id, u.name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
      `, [chatId]);

      client.release();

      if (result.rows.length === 0) {
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Please connect your Telegram account first using /verify or /login',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = result.rows[0];

      // Set state for routine creation
      userStates.set(chatId, {
        action: 'awaiting_routine_info',
        userId: user.user_id,
        userName: user.name
      });

      const message = `
📋 *Create New Routine Template*

Please send routine information in this format:
\`Name | Description\`

*Example:*
\`Morning Routine | Daily morning productivity tasks\`
\`Evening Routine | Wind down and prepare for tomorrow\`
\`Study Routine | Learning and development tasks\`

*Format:*
• Name: Short name for the routine (required)
• Description: Detailed description (optional)

Send your routine info now, or /cancel to abort.
      `;

      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Error in createroutine command:', error);
      await bot.sendMessage(chatId, '❌ Error creating routine. Please try again.');
    }
  });

  // /quickroutine command - Interactive routine creation (NO SYMBOLS!)
  bot.onText(/\/quickroutine/, async (msg) => {
    const chatId = msg.chat.id;
    
    console.log(`📋 /quickroutine command received from ${msg.from.username || msg.from.first_name} (${chatId})`);

    try {
      const client = await pool.connect();

      const result = await client.query(`
        SELECT utc.user_id, u.name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
      `, [chatId]);

      client.release();

      if (result.rows.length === 0) {
        await bot.sendMessage(chatId,
          '❌ Please connect first using /login or /verify',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = result.rows[0];

      // Set state for interactive routine creation
      userStates.set(chatId, {
        action: 'awaiting_interactive_routine',
        step: 'name',
        userId: user.user_id,
        userName: user.name,
        routineData: {},
        tasks: []
      });

      await bot.sendMessage(chatId,
        '📋 *Quick Create Routine* (Interactive Mode)\n\n' +
        '📝 *Step 1/2:* What is the routine name?\n\n' +
        'Just type the routine name, no symbols needed!\n\n' +
        '*Example:* Morning Routine\n\n' +
        'Or /cancel to abort.',
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('Error in quickroutine command:', error);
      await bot.sendMessage(chatId, '❌ Error. Please try again.');
    }
  });

  // /addtasktoroutine command - Add task to routine template
  bot.onText(/\/addtasktoroutine\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const routineId = match[1]?.trim();
    
    console.log(`➕ /addtasktoroutine command received from ${msg.from.username || msg.from.first_name} (${chatId})`);
    console.log(`📋 Routine ID: "${routineId}"`);

    try {
      const client = await pool.connect();

      // Check if user is verified
      const result = await client.query(`
        SELECT utc.user_id, u.name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
      `, [chatId]);

      if (result.rows.length === 0) {
        client.release();
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Please connect your Telegram account first using /verify or /login',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = result.rows[0];

      // Verify routine exists and belongs to user
      const routineResult = await client.query(`
        SELECT * FROM routine_templates
        WHERE id = $1 AND user_id = $2
      `, [routineId, user.user_id]);

      client.release();

      if (routineResult.rows.length === 0) {
        await bot.sendMessage(chatId,
          '❌ *Routine Not Found*\n\n' +
          'This routine doesn\'t exist or doesn\'t belong to you.\n\n' +
          'Use /myroutines to see your routines.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const routine = routineResult.rows[0];

      // Set state for task creation
      userStates.set(chatId, {
        action: 'awaiting_routine_task_input',
        userId: user.user_id,
        userName: user.name,
        routineId: routineId,
        routineName: routine.name
      });

      const message = `
➕ *Add Task to Routine*

📋 Routine: *${routine.name}*

Please send task information in this format:
\`Title | Description | Priority | Category | TimeStart | TimeEnd\`

*Examples:*
\`Morning Exercise | 30 min workout | high | rest | 06:00 | 06:30\`
\`Check Emails | Review and respond | medium | work | 09:00 | 09:30\`
\`Study Session | Learn new topics | high | learn | 14:00 | 16:00\`

*Fields:*
• *Title:* Task name (required)
• *Description:* Task details (optional)
• *Priority:* high/medium/low (default: medium)
• *Category:* work/learn/rest (default: work)
• *TimeStart:* Start time HH:MM ⚠️ *REQUIRED for reminders!*
• *TimeEnd:* End time HH:MM (optional)

⏰ *Important:* TimeStart is REQUIRED for the reminder system to work!

Send your task info now, or /cancel to abort.
      `;

      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Error in addtasktoroutine command:', error);
      await bot.sendMessage(chatId, '❌ Error. Please try again.');
    }
  });

  // /quickaddtask command - Interactive add task to routine (NO SYMBOLS!)
  bot.onText(/\/quickaddtask(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const routineId = match[1]?.trim();
    
    console.log(`➕ /quickaddtask command received from ${msg.from.username || msg.from.first_name} (${chatId})`);

    try {
      const client = await pool.connect();

      const result = await client.query(`
        SELECT utc.user_id, u.name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
      `, [chatId]);

      if (result.rows.length === 0) {
        client.release();
        await bot.sendMessage(chatId,
          '❌ Please connect first using /login or /verify',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = result.rows[0];

      // If no routine ID provided, show list of routines
      if (!routineId) {
        const routinesResult = await client.query(`
          SELECT rt.id, rt.name, rt.description,
                 COUNT(rtt.id) as tasks_count
          FROM routine_templates rt
          LEFT JOIN routine_template_tasks rtt ON rt.id = rtt.routine_template_id AND rtt.is_active = true
          WHERE rt.user_id = $1 AND rt.is_active = true
          GROUP BY rt.id
          ORDER BY rt.created_at DESC
          LIMIT 10
        `, [user.user_id]);

        client.release();

        if (routinesResult.rows.length === 0) {
          await bot.sendMessage(chatId,
            '❌ *No Routines Found*\n\n' +
            'You don\'t have any active routines.\n' +
            'Create one first with /quickroutine',
            { parse_mode: 'Markdown' }
          );
          return;
        }

        // Show routine selection buttons
        const keyboard = routinesResult.rows.map(routine => [{
          text: `📋 ${routine.name} (${routine.tasks_count} tasks)`,
          callback_data: `select_routine_for_task_${routine.id}`
        }]);

        await bot.sendMessage(chatId,
          '➕ *Add Task to Routine*\n\n' +
          'Select a routine to add task:',
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
          }
        );
        return;
      }

      // Verify routine exists and belongs to user
      const routineResult = await client.query(`
        SELECT * FROM routine_templates
        WHERE id = $1 AND user_id = $2
      `, [routineId, user.user_id]);

      client.release();

      if (routineResult.rows.length === 0) {
        await bot.sendMessage(chatId,
          '❌ Routine not found or doesn\'t belong to you.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const routine = routineResult.rows[0];

      // Set state for interactive task creation
      userStates.set(chatId, {
        action: 'awaiting_interactive_routine_task',
        step: 'title',
        userId: user.user_id,
        userName: user.name,
        routineId: routineId,
        routineName: routine.name,
        taskData: {}
      });

      await bot.sendMessage(chatId,
        `➕ *Add Task to Routine*\n\n` +
        `📋 Routine: *${routine.name}*\n\n` +
        `📝 *Step 1/6:* What is the task title?\n\n` +
        `*Example:* Morning Exercise`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('Error in quickaddtask command:', error);
      await bot.sendMessage(chatId, '❌ Error. Please try again.');
    }
  });

  // /cancel command - Cancel current operation
  bot.onText(/\/cancel/, async (msg) => {
    const chatId = msg.chat.id;
    const userState = userStates.get(chatId);

    if (!userState) {
      await bot.sendMessage(chatId, 'ℹ️ No ongoing operation to cancel.');
      return;
    }

    userStates.delete(chatId);
    await bot.sendMessage(chatId, '✅ Operation cancelled.');
  });

  // Callback query handler for inline buttons
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;

    console.log(`🔘 Callback query from ${callbackQuery.from.username || callbackQuery.from.first_name}: ${data}`);

    try {
      // Answer callback query to remove loading state
      await bot.answerCallbackQuery(callbackQuery.id);

      // Handle different callback data patterns
      if (data === 'cmd_status') {
        // Execute /status command directly - forward to command
        // Simulate command execution by creating proper message object
        const fakeMsg = {
          chat: { id: chatId },
          from: callbackQuery.from,
          message_id: Date.now()
        };
        // Manually trigger the status command logic
        // Find and execute status command handler
        bot.processUpdate({
          update_id: Date.now(),
          message: {
            ...fakeMsg,
            date: Math.floor(Date.now() / 1000),
            text: '/status'
          }
        });
      } else if (data === 'cmd_addtask') {
        // Execute /quickadd command directly (interactive, no symbols needed!)
        const fakeMsg = {
          chat: { id: chatId },
          from: callbackQuery.from,
          message_id: Date.now()
        };
        bot.processUpdate({
          update_id: Date.now(),
          message: {
            ...fakeMsg,
            date: Math.floor(Date.now() / 1000),
            text: '/addtask'
          }
        });
      } else if (data === 'cmd_mytasks') {
        // Execute /mytasks command directly
        const fakeMsg = {
          chat: { id: chatId },
          from: callbackQuery.from,
          message_id: Date.now()
        };
        bot.processUpdate({
          update_id: Date.now(),
          message: {
            ...fakeMsg,
            date: Math.floor(Date.now() / 1000),
            text: '/mytasks'
          }
        });
      } else if (data === 'cmd_today') {
        // Execute /today command directly
        const fakeMsg = {
          chat: { id: chatId },
          from: callbackQuery.from,
          message_id: Date.now()
        };
        bot.processUpdate({
          update_id: Date.now(),
          message: {
            ...fakeMsg,
            date: Math.floor(Date.now() / 1000),
            text: '/today'
          }
        });
      } else if (data === 'cmd_complete') {
        // Execute /complete command directly
        const fakeMsg = {
          chat: { id: chatId },
          from: callbackQuery.from,
          message_id: Date.now()
        };
        bot.processUpdate({
          update_id: Date.now(),
          message: {
            ...fakeMsg,
            date: Math.floor(Date.now() / 1000),
            text: '/complete'
          }
        });
      } else if (data === 'cmd_help') {
        // Execute /help command directly
        const fakeMsg = {
          chat: { id: chatId },
          from: callbackQuery.from,
          message_id: Date.now()
        };
        bot.processUpdate({
          update_id: Date.now(),
          message: {
            ...fakeMsg,
            date: Math.floor(Date.now() / 1000),
            text: '/help'
          }
        });
      } else if (data === 'cmd_menu') {
        // Execute /menu command directly
        const fakeMsg = {
          chat: { id: chatId },
          from: callbackQuery.from,
          message_id: Date.now()
        };
        bot.processUpdate({
          update_id: Date.now(),
          message: {
            ...fakeMsg,
            date: Math.floor(Date.now() / 1000),
            text: '/menu'
          }
        });
      } else if (data === 'cmd_myroutines') {
        // Execute /myroutines command directly
        const fakeMsg = {
          chat: { id: chatId },
          from: callbackQuery.from,
          message_id: Date.now()
        };
        bot.processUpdate({
          update_id: Date.now(),
          message: {
            ...fakeMsg,
            date: Math.floor(Date.now() / 1000),
            text: '/myroutines'
          }
        });
      } else if (data === 'cmd_edittask') {
        // Execute /edittask command directly
        const fakeMsg = {
          chat: { id: chatId },
          from: callbackQuery.from,
          message_id: Date.now()
        };
        bot.processUpdate({
          update_id: Date.now(),
          message: {
            ...fakeMsg,
            date: Math.floor(Date.now() / 1000),
            text: '/edittask'
          }
        });
      } else if (data === 'cmd_deletetask') {
        // Execute /deletetask command directly
        const fakeMsg = {
          chat: { id: chatId },
          from: callbackQuery.from,
          message_id: Date.now()
        };
        bot.processUpdate({
          update_id: Date.now(),
          message: {
            ...fakeMsg,
            date: Math.floor(Date.now() / 1000),
            text: '/deletetask'
          }
        });
      } else if (data === 'generate_all_routines') {
        // Generate all active routines
        await handleGenerateAllRoutines(chatId);
      } else if (data.startsWith('add_task_routine_')) {
        // Add task to specific routine
        const routineId = data.replace('add_task_routine_', '');
        const fakeMsg = {
          chat: { id: chatId },
          from: callbackQuery.from,
          message_id: Date.now()
        };
        // Mark that the next /addtask should attach to this routine, then open the interactive /addtask flow
        routineAttachMap.set(chatId, routineId);
        bot.processUpdate({
          update_id: Date.now(),
          message: {
            ...fakeMsg,
            date: Math.floor(Date.now() / 1000),
            text: '/addtask'
          }
        });
      } else if (data.startsWith('task_complete_')) {
        // Mark task as complete
        const taskId = data.replace('task_complete_', '');
        await handleTaskComplete(chatId, taskId);
      } else if (data.startsWith('task_edit_')) {
        // Edit task
        const taskId = data.replace('task_edit_', '');
        await handleTaskEditStart(chatId, taskId);
      } else if (data.startsWith('task_delete_')) {
        // Delete task with confirmation
        const taskId = data.replace('task_delete_', '');
        await handleTaskDeleteConfirm(chatId, messageId, taskId);
      } else if (data.startsWith('confirm_delete_')) {
        // Confirm delete
        const taskId = data.replace('confirm_delete_', '');
        await handleTaskDeleteExecute(chatId, messageId, taskId);
      } else if (data.startsWith('cancel_delete_')) {
        // Cancel delete
        await bot.editMessageText('❌ Delete cancelled.', {
          chat_id: chatId,
          message_id: messageId
        });
      } else if (data === 'show_templates') {
        // Show task templates
        await showTaskTemplates(chatId);
      } else if (data.startsWith('template_')) {
        // Use task template
        const templateType = data.replace('template_', '');
        await useTaskTemplate(chatId, templateType);
      } else if (data.startsWith('priority_')) {
        // Handle priority selection in interactive mode
        const priority = data.replace('priority_', '');
        await handlePrioritySelection(chatId, priority);
      } else if (data.startsWith('category_')) {
        // Handle category selection in interactive mode
        const category = data.replace('category_', '');
        await handleCategorySelection(chatId, category);
      } else if (data.startsWith('select_routine_for_task_')) {
        // Handle routine selection for adding task
        const routineId = data.replace('select_routine_for_task_', '');
        
        // Trigger /quickaddtask with routine ID
        const fakeMsg = {
          chat: { id: chatId },
          from: callbackQuery.from,
          message_id: Date.now()
        };
        bot.processUpdate({
          update_id: Date.now(),
          message: {
            ...fakeMsg,
            date: Math.floor(Date.now() / 1000),
            text: `/quickaddtask ${routineId}`
          }
        });
      } else if (data === 'routine_done') {
        // Finish routine creation
        userStates.delete(chatId);
        await bot.editMessageText(
          '✅ *Routine Created Successfully!*\n\n' +
          'You can view your routines with /myroutines',
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown'
          }
        );
      } else if (data.startsWith('add_task_to_new_routine_')) {
        // Add task to newly created routine: open the interactive /addtask flow
        const routineId = data.replace('add_task_to_new_routine_', '');

        // Mark that the next /addtask should attach to this routine, then open the interactive /addtask flow
        routineAttachMap.set(chatId, routineId);

        const fakeMsg = {
          chat: { id: chatId },
          from: callbackQuery.from,
          message_id: Date.now()
        };
        bot.processUpdate({
          update_id: Date.now(),
          message: {
            ...fakeMsg,
            date: Math.floor(Date.now() / 1000),
            text: '/addtask'
          }
        });

        // Clear previous routine creation state
        userStates.delete(chatId);
      } else if (data.startsWith('routine_delete_')) {
        // Ask for confirmation before deleting routine template
        const routineId = data.replace('routine_delete_', '');
        await bot.editMessageText('⚠️ Are you sure you want to delete this routine template? This cannot be undone.', {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🗑️ Confirm Delete', callback_data: `confirm_delete_routine_${routineId}` },
              { text: '❌ Cancel', callback_data: `cancel_delete_routine_${routineId}` }
            ]]
          }
        });
      } else if (data.startsWith('confirm_delete_routine_')) {
        const routineId = data.replace('confirm_delete_routine_', '');
        // Verify user and delete
        const client = await pool.connect();
        try {
          const userRes = await client.query(`SELECT user_id FROM user_telegram_config WHERE telegram_chat_id = $1 AND is_verified = true`, [chatId]);
          if (userRes.rows.length === 0) {
            client.release();
            await bot.editMessageText('❌ Not connected. Please /login or /verify first.', { chat_id: chatId, message_id: messageId });
            return;
          }
          const userId = userRes.rows[0].user_id;
          const routineModel = await import('../models/routineModel.js');
          const deleted = await routineModel.deleteRoutineTemplate(routineId, userId);
          client.release();

          if (!deleted) {
            await bot.editMessageText('⚠️ Routine not found or you do not have permission to delete it.', { chat_id: chatId, message_id: messageId });
            return;
          }

          await bot.editMessageText('✅ Routine template deleted successfully.', { chat_id: chatId, message_id: messageId });
        } catch (err) {
          client.release();
          console.error('Error deleting routine:', err);
          await bot.sendMessage(chatId, '❌ Error deleting routine. Please try again.');
        }
      } else if (data.startsWith('cancel_delete_routine_')) {
        await bot.editMessageText('❌ Routine deletion cancelled.', { chat_id: chatId, message_id: messageId });
      } else if (data.startsWith('routine_edit_')) {
        // Start interactive edit for routine template - show field selection
        const routineId = data.replace('routine_edit_', '');
        await handleRoutineEditStart(chatId, routineId);
      } else if (data.startsWith('edit_title_')) {
        // Edit task title
        const taskId = data.replace('edit_title_', '');
        await handleEditField(chatId, taskId, 'title', '📝 Send new title for this task:');
      } else if (data.startsWith('edit_description_')) {
        // Edit task description
        const taskId = data.replace('edit_description_', '');
        await handleEditField(chatId, taskId, 'description', '📄 Send new description for this task (or send "-" to remove):');
      } else if (data.startsWith('edit_priority_')) {
        // Edit task priority
        const taskId = data.replace('edit_priority_', '');
        await handleEditField(chatId, taskId, 'priority', '📊 Choose priority:', 'priority_buttons');
      } else if (data.startsWith('edit_category_')) {
        // Edit task category
        const taskId = data.replace('edit_category_', '');
        await handleEditField(chatId, taskId, 'category', '📁 Choose category:', 'category_buttons');
      } else if (data.startsWith('edit_time_start_')) {
        // Edit task start time
        const taskId = data.replace('edit_time_start_', '');
        await handleEditField(chatId, taskId, 'time_start', '⏰ Send new start time (HH:MM format, e.g., 09:00):');
      } else if (data.startsWith('edit_time_end_')) {
        // Edit task end time
        const taskId = data.replace('edit_time_end_', '');
        await handleEditField(chatId, taskId, 'time_end', '⏰ Send new end time (HH:MM format, e.g., 10:00) or send "-" to remove:');
      } else if (data.startsWith('edit_status_')) {
        // Edit task status
        const taskId = data.replace('edit_status_', '');
        await handleEditField(chatId, taskId, 'status', '📊 Choose status:', 'status_buttons');
      } else if (data === 'cancel_edit') {
        // Cancel edit
        await bot.sendMessage(chatId, '❌ Edit cancelled.');
      } else if (data.startsWith('set_priority_')) {
        // Set priority from button
        const parts = data.split('_');
        const priority = parts[2];
        const taskId = parts[3];
        await handleFieldUpdate(chatId, taskId, 'priority', priority);
      } else if (data.startsWith('set_category_')) {
        // Set category from button
        const parts = data.split('_');
        const category = parts[2];
        const taskId = parts[3];
        await handleFieldUpdate(chatId, taskId, 'category', category);
      } else if (data.startsWith('set_status_')) {
        // Set status from button
        const parts = data.split('_');
        const status = parts[2];
        const taskId = parts[3];
        await handleFieldUpdate(chatId, taskId, 'status', status);
      } else if (data.startsWith('edit_routine_name_')) {
        // Edit routine name
        const routineId = data.replace('edit_routine_name_', '');
        await handleEditRoutineField(chatId, routineId, 'name', '📋 Send new name for this routine:');
      } else if (data.startsWith('edit_routine_description_')) {
        // Edit routine description
        const routineId = data.replace('edit_routine_description_', '');
        await handleEditRoutineField(chatId, routineId, 'description', '📄 Send new description for this routine (or send "-" to remove):');
      } else if (data === 'cancel_routine_edit') {
        // Cancel routine edit
        await bot.sendMessage(chatId, '❌ Routine edit cancelled.');
      } else {
        // Unknown callback data
        console.log(`⚠️ Unknown callback data: ${data}`);
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: '❌ Unknown action',
          show_alert: false
        });
      }

    } catch (error) {
      console.error('Error handling callback query:', error);
      await bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
    }
  });

  // Handle polling errors
  bot.on('polling_error', (error) => {
    console.error('Telegram Bot polling error:', error.message);
  });

  // Global message handler for state-based interactions
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    console.log(`📨 Message received from ${msg.from.username || msg.from.first_name} (${chatId}): ${text}`);

    // Skip if it's a command
    if (text && text.startsWith('/')) {
      console.log(`⏭️  Skipping command: ${text}`);
      return;
    }

    // Check if user has a pending state
    const userState = userStates.get(chatId);
    console.log(`🔍 User state for ${chatId}:`, userState);
    
    if (!userState) {
      console.log(`ℹ️  No pending state for user ${chatId}`);
      return;
    }

    // Handle based on state
    if (userState.action === 'awaiting_task_input') {
      console.log(`✅ Processing task input for user ${chatId}`);
      await handleTaskInput(chatId, text, userState.userId, userState.userName);
      userStates.delete(chatId);
      console.log(`🗑️  State cleared for user ${chatId}`);
    } else if (userState.action === 'awaiting_interactive_task') {
      console.log(`✅ Processing interactive task input - step: ${userState.step}`);
      await handleInteractiveTaskInput(chatId, text, userState);
      // State will be managed by handler
    } else if (userState.action === 'awaiting_interactive_routine') {
      console.log(`✅ Processing interactive routine input - step: ${userState.step}`);
      await handleInteractiveRoutineInput(chatId, text, userState);
      // State will be managed by handler
    } else if (userState.action === 'awaiting_interactive_routine_task') {
      console.log(`✅ Processing interactive routine task input - step: ${userState.step}`);
      await handleInteractiveRoutineTaskInput(chatId, text, userState);
      // State will be managed by handler
    } else if (userState.action === 'awaiting_task_edit') {
      console.log(`✅ Processing task edit for user ${chatId}`);
      await handleTaskEdit(chatId, text, userState.userId, userState.taskId, userState.currentTask);
      userStates.delete(chatId);
      console.log(`🗑️  State cleared for user ${chatId}`);
    } else if (userState.action === 'awaiting_routine_info') {
      console.log(`✅ Processing routine info for user ${chatId}`);
      await handleRoutineCreation(chatId, text, userState.userId, userState.userName);
      userStates.delete(chatId);
      console.log(`🗑️  State cleared for user ${chatId}`);
    } else if (userState.action === 'awaiting_routine_task_input') {
      console.log(`✅ Processing routine task input for user ${chatId}`);
      await handleRoutineTaskInput(chatId, text, userState.userId, userState.routineId, userState.routineName);
      userStates.delete(chatId);
      console.log(`🗑️  State cleared for user ${chatId}`);
    } else if (userState.action === 'awaiting_routine_edit') {
      console.log(`✅ Processing routine edit for user ${chatId}`);
      await handleRoutineEditInput(chatId, text, userState);
      userStates.delete(chatId);
      console.log(`🗑️  State cleared for user ${chatId}`);
    } else if (userState.action === 'awaiting_routine_field_edit') {
      console.log(`✅ Processing routine field edit for user ${chatId}`);
      await handleRoutineFieldEditInput(chatId, text, userState);
      userStates.delete(chatId);
      console.log(`🗑️  State cleared for user ${chatId}`);
    } else if (userState.action === 'awaiting_field_edit') {
      console.log(`✅ Processing field edit for user ${chatId}`);
      await handleFieldEditInput(chatId, text, userState);
      userStates.delete(chatId);
      console.log(`🗑️  State cleared for user ${chatId}`);
    } else if (userState.action === 'awaiting_password') {
      // This is handled by the one-time handler in /login
      // Don't interfere
      console.log(`🔐 Awaiting password, skipping...`);
      return;
    }
  });

  console.log('✅ Telegram Bot command handlers registered');
};

// Helper function for marking task as complete
const handleTaskComplete = async (chatId, taskId) => {
  try {
    const client = await pool.connect();

    // Get user info
    const userResult = await client.query(`
      SELECT utc.user_id, u.name
      FROM user_telegram_config utc
      JOIN users u ON utc.user_id = u.id
      WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
    `, [chatId]);

    if (userResult.rows.length === 0) {
      client.release();
      await bot.sendMessage(chatId, '❌ Please connect first using /login');
      return;
    }

    const user = userResult.rows[0];

    // Update task status
    const updateResult = await client.query(`
      UPDATE tasks
      SET status = 'done', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [taskId, user.user_id]);

    client.release();

    if (updateResult.rows.length === 0) {
      await bot.sendMessage(chatId, '❌ Task not found');
      return;
    }

    const task = updateResult.rows[0];
    await bot.sendMessage(chatId,
      `✅ *Task Completed!*\n\n` +
      `~~${task.title}~~\n\n` +
      `Great job! Keep up the momentum! 🎉`,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Error completing task:', error);
    await bot.sendMessage(chatId, '❌ Error completing task');
  }
};

// Helper function to start task edit
const handleTaskEditStart = async (chatId, taskId) => {
  try {
    const client = await pool.connect();

    // Get user info
    const userResult = await client.query(`
      SELECT utc.user_id, u.name
      FROM user_telegram_config utc
      JOIN users u ON utc.user_id = u.id
      WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
    `, [chatId]);

    if (userResult.rows.length === 0) {
      client.release();
      await bot.sendMessage(chatId, '❌ Please connect first using /login');
      return;
    }

    const user = userResult.rows[0];

    // Get task
    const taskResult = await client.query(`
      SELECT * FROM tasks
      WHERE id = $1 AND user_id = $2
    `, [taskId, user.user_id]);

    client.release();

    if (taskResult.rows.length === 0) {
      await bot.sendMessage(chatId, '❌ Task not found');
      return;
    }

    const task = taskResult.rows[0];

    // Show current task and edit options
    const message = `
✏️ *Edit Task*

*Current Task:*
📝 *Title:* ${task.title}
📄 *Description:* ${task.description || '(none)'}
📊 *Priority:* ${task.priority}
📁 *Category:* ${task.category}
⏰ *Time:* ${task.time_start || '(none)'}${task.time_end ? ` - ${task.time_end}` : ''}
📊 *Status:* ${task.status}

What would you like to edit?
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📝 Title', callback_data: `edit_title_${taskId}` },
          { text: '📄 Description', callback_data: `edit_description_${taskId}` }
        ],
        [
          { text: '📊 Priority', callback_data: `edit_priority_${taskId}` },
          { text: '📁 Category', callback_data: `edit_category_${taskId}` }
        ],
        [
          { text: '⏰ Start Time', callback_data: `edit_time_start_${taskId}` },
          { text: '⏰ End Time', callback_data: `edit_time_end_${taskId}` }
        ],
        [
          { text: '📊 Status', callback_data: `edit_status_${taskId}` },
          { text: '❌ Cancel', callback_data: 'cancel_edit' }
        ]
      ]
    };

    await bot.sendMessage(chatId, message, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

  } catch (error) {
    console.error('Error starting task edit:', error);
    await bot.sendMessage(chatId, '❌ Error starting edit');
  }
};

// Helper function to start routine edit
const handleRoutineEditStart = async (chatId, routineId) => {
  try {
    const client = await pool.connect();

    // Get user info
    const userResult = await client.query(`
      SELECT utc.user_id, u.name
      FROM user_telegram_config utc
      JOIN users u ON utc.user_id = u.id
      WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
    `, [chatId]);

    if (userResult.rows.length === 0) {
      client.release();
      await bot.sendMessage(chatId, '❌ Please connect first using /login');
      return;
    }

    const user = userResult.rows[0];

    // Get routine
    const routineResult = await client.query(`
      SELECT * FROM routine_templates
      WHERE id = $1 AND user_id = $2
    `, [routineId, user.user_id]);

    client.release();

    if (routineResult.rows.length === 0) {
      await bot.sendMessage(chatId, '❌ Routine not found');
      return;
    }

    const routine = routineResult.rows[0];

    // Show current routine and edit options
    const message = `
✏️ *Edit Routine*

*Current Routine:*
📋 *Name:* ${routine.name}
📄 *Description:* ${routine.description || '(none)'}

What would you like to edit?
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📋 Name', callback_data: `edit_routine_name_${routineId}` },
          { text: '📄 Description', callback_data: `edit_routine_description_${routineId}` }
        ],
        [
          { text: '❌ Cancel', callback_data: 'cancel_routine_edit' }
        ]
      ]
    };

    await bot.sendMessage(chatId, message, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

  } catch (error) {
    console.error('Error starting routine edit:', error);
    await bot.sendMessage(chatId, '❌ Error starting edit');
  }
};

// Helper function to handle field-specific editing
const handleEditField = async (chatId, taskId, field, promptMessage, buttonType = null) => {
  try {
    const client = await pool.connect();

    // Get user info
    const userResult = await client.query(`
      SELECT utc.user_id, u.name
      FROM user_telegram_config utc
      JOIN users u ON utc.user_id = u.id
      WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
    `, [chatId]);

    if (userResult.rows.length === 0) {
      client.release();
      await bot.sendMessage(chatId, '❌ Please connect first using /login');
      return;
    }

    const user = userResult.rows[0];

    // Get current task
    const taskResult = await client.query(`
      SELECT * FROM tasks
      WHERE id = $1 AND user_id = $2
    `, [taskId, user.user_id]);

    client.release();

    if (taskResult.rows.length === 0) {
      await bot.sendMessage(chatId, '❌ Task not found');
      return;
    }

    const task = taskResult.rows[0];

    // Set state for field editing
    userStates.set(chatId, {
      action: 'awaiting_field_edit',
      userId: user.user_id,
      taskId: taskId,
      field: field,
      currentTask: task
    });

    // Handle different field types
    if (buttonType === 'priority_buttons') {
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔴 High', callback_data: `set_priority_high_${taskId}` },
            { text: '🟡 Medium', callback_data: `set_priority_medium_${taskId}` },
            { text: '🟢 Low', callback_data: `set_priority_low_${taskId}` }
          ]
        ]
      };
      await bot.sendMessage(chatId, `${promptMessage}\n\n*Current:* ${task.priority}`, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } else if (buttonType === 'category_buttons') {
      const keyboard = {
        inline_keyboard: [
          [
            { text: '💼 Work', callback_data: `set_category_work_${taskId}` },
            { text: '📚 Learn', callback_data: `set_category_learn_${taskId}` },
            { text: '🧘 Rest', callback_data: `set_category_rest_${taskId}` }
          ]
        ]
      };
      await bot.sendMessage(chatId, `${promptMessage}\n\n*Current:* ${task.category}`, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } else if (buttonType === 'status_buttons') {
      const keyboard = {
        inline_keyboard: [
          [
            { text: '📋 Pending', callback_data: `set_status_pending_${taskId}` },
            { text: '🔄 In Progress', callback_data: `set_status_in_progress_${taskId}` },
            { text: '✅ Done', callback_data: `set_status_done_${taskId}` }
          ]
        ]
      };
      await bot.sendMessage(chatId, `${promptMessage}\n\n*Current:* ${task.status}`, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } else {
      // Text input fields
      await bot.sendMessage(chatId, `${promptMessage}\n\n*Current:* ${task[field] || '(none)'}\n\nSend /cancel to abort.`, {
        parse_mode: 'Markdown'
      });
    }

  } catch (error) {
    console.error('Error handling field edit:', error);
    await bot.sendMessage(chatId, '❌ Error starting field edit');
  }
};

// Helper function to update a specific field
const handleFieldUpdate = async (chatId, taskId, field, value) => {
  try {
    const client = await pool.connect();

    // Get user info
    const userResult = await client.query(`
      SELECT utc.user_id, u.name
      FROM user_telegram_config utc
      JOIN users u ON utc.user_id = u.id
      WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
    `, [chatId]);

    if (userResult.rows.length === 0) {
      client.release();
      await bot.sendMessage(chatId, '❌ Please connect first using /login');
      return;
    }

    const user = userResult.rows[0];

    // Handle special cases for value processing
    let processedValue = value;
    if (field === 'description' && value === '-') {
      processedValue = null;
    } else if (field === 'time_end' && value === '-') {
      processedValue = null;
    }

    // Update the field
    const updateResult = await client.query(`
      UPDATE tasks
      SET ${field} = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [processedValue, taskId, user.user_id]);

    client.release();

    if (updateResult.rows.length === 0) {
      await bot.sendMessage(chatId, '❌ Task not found or update failed');
      return;
    }

    const updatedTask = updateResult.rows[0];

    // Handle reminder updates if time changed (optional - can be handled by scheduler)
    // Note: Reminder updates are handled automatically by the scheduler service

    // Send success message
    const fieldEmoji = {
      title: '📝',
      description: '📄',
      priority: '📊',
      category: '📁',
      time_start: '⏰',
      time_end: '⏰',
      status: '📊'
    };

    const fieldName = {
      title: 'Title',
      description: 'Description',
      priority: 'Priority',
      category: 'Category',
      time_start: 'Start Time',
      time_end: 'End Time',
      status: 'Status'
    };

    await bot.sendMessage(chatId,
      `✅ *${fieldName[field]} Updated Successfully!*\n\n` +
      `${fieldEmoji[field]} ${fieldName[field]}: ${processedValue || '(removed)'}\n\n` +
      `📋 *Task:* ${updatedTask.title}`,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Error updating field:', error);
    await bot.sendMessage(chatId, '❌ Error updating field. Please try again.');
  }
};

// Helper function to handle field edit input
const handleFieldEditInput = async (chatId, text, userState) => {
  const { field, taskId } = userState;

  try {
    let value = text.trim();

    // Validate input based on field type
    if (field === 'title') {
      if (!value) {
        await bot.sendMessage(chatId, '❌ Title cannot be empty. Please try again.');
        return;
      }
    } else if (field === 'description') {
      // Allow empty description (will be set to null)
      value = value === '-' ? null : value;
    } else if (field === 'time_start' || field === 'time_end') {
      if (field === 'time_end' && value === '-') {
        value = null;
      } else {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(value)) {
          await bot.sendMessage(chatId, '❌ Invalid time format. Please use HH:MM format (e.g., 09:00).');
          return;
        }
      }
    }

    // Update the field
    await handleFieldUpdate(chatId, taskId, field, value);

  } catch (error) {
    console.error('Error processing field edit input:', error);
    await bot.sendMessage(chatId, '❌ Error processing input. Please try again.');
  }
};

// Helper function to handle routine field-specific editing
const handleEditRoutineField = async (chatId, routineId, field, promptMessage) => {
  try {
    const client = await pool.connect();

    // Get user info
    const userResult = await client.query(`
      SELECT utc.user_id, u.name
      FROM user_telegram_config utc
      JOIN users u ON utc.user_id = u.id
      WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
    `, [chatId]);

    if (userResult.rows.length === 0) {
      client.release();
      await bot.sendMessage(chatId, '❌ Please connect first using /login');
      return;
    }

    const user = userResult.rows[0];

    // Get current routine
    const routineResult = await client.query(`
      SELECT * FROM routine_templates
      WHERE id = $1 AND user_id = $2
    `, [routineId, user.user_id]);

    client.release();

    if (routineResult.rows.length === 0) {
      await bot.sendMessage(chatId, '❌ Routine not found');
      return;
    }

    const routine = routineResult.rows[0];

    // Set state for routine field editing
    userStates.set(chatId, {
      action: 'awaiting_routine_field_edit',
      userId: user.user_id,
      routineId: routineId,
      field: field,
      currentRoutine: routine
    });

    // Text input fields
    await bot.sendMessage(chatId, `${promptMessage}\n\n*Current:* ${routine[field] || '(none)'}\n\nSend /cancel to abort.`, {
      parse_mode: 'Markdown'
    });

  } catch (error) {
    console.error('Error handling routine field edit:', error);
    await bot.sendMessage(chatId, '❌ Error starting routine field edit');
  }
};

// Helper function to update a specific routine field
const handleRoutineFieldUpdate = async (chatId, routineId, field, value) => {
  try {
    const client = await pool.connect();

    // Get user info
    const userResult = await client.query(`
      SELECT utc.user_id, u.name
      FROM user_telegram_config utc
      JOIN users u ON utc.user_id = u.id
      WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
    `, [chatId]);

    if (userResult.rows.length === 0) {
      client.release();
      await bot.sendMessage(chatId, '❌ Please connect first using /login');
      return;
    }

    const user = userResult.rows[0];

    // Handle special cases for value processing
    let processedValue = value;
    if (field === 'description' && value === '-') {
      processedValue = null;
    }

    // Update the field
    const updateResult = await client.query(`
      UPDATE routine_templates
      SET ${field} = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [processedValue, routineId, user.user_id]);

    client.release();

    if (updateResult.rows.length === 0) {
      await bot.sendMessage(chatId, '❌ Routine not found or update failed');
      return;
    }

    const updatedRoutine = updateResult.rows[0];

    // Send success message
    const fieldEmoji = {
      name: '📋',
      description: '📄'
    };

    const fieldName = {
      name: 'Name',
      description: 'Description'
    };

    await bot.sendMessage(chatId,
      `✅ *${fieldName[field]} Updated Successfully!*\n\n` +
      `${fieldEmoji[field]} ${fieldName[field]}: ${processedValue || '(removed)'}\n\n` +
      `📋 *Routine:* ${updatedRoutine.name}`,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Error updating routine field:', error);
    await bot.sendMessage(chatId, '❌ Error updating routine field. Please try again.');
  }
};

// Helper function to handle routine field edit input
const handleRoutineFieldEditInput = async (chatId, text, userState) => {
  const { field, routineId } = userState;

  try {
    let value = text.trim();

    // Validate input based on field type
    if (field === 'name') {
      if (!value) {
        await bot.sendMessage(chatId, '❌ Routine name cannot be empty. Please try again.');
        return;
      }
    } else if (field === 'description') {
      // Allow empty description (will be set to null)
      value = value === '-' ? null : value;
    }

    // Update the field
    await handleRoutineFieldUpdate(chatId, routineId, field, value);

  } catch (error) {
    console.error('Error processing routine field edit input:', error);
    await bot.sendMessage(chatId, '❌ Error processing input. Please try again.');
  }
};

// Helper function to show delete confirmation
const handleTaskDeleteConfirm = async (chatId, messageId, taskId) => {
  try {
    const client = await pool.connect();

    // Get user info
    const userResult = await client.query(`
      SELECT utc.user_id, u.name
      FROM user_telegram_config utc
      JOIN users u ON utc.user_id = u.id
      WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
    `, [chatId]);

    if (userResult.rows.length === 0) {
      client.release();
      await bot.sendMessage(chatId, '❌ Please connect first using /login');
      return;
    }

    const user = userResult.rows[0];

    // Get task
    const taskResult = await client.query(`
      SELECT * FROM tasks
      WHERE id = $1 AND user_id = $2
    `, [taskId, user.user_id]);

    client.release();

    if (taskResult.rows.length === 0) {
      await bot.sendMessage(chatId, '❌ Task not found');
      return;
    }

    const task = taskResult.rows[0];

    const confirmMessage = `
⚠️ *Confirm Delete*

Are you sure you want to delete this task?

*${task.title}*
${task.description ? `_${task.description.substring(0, 50)}..._` : ''}

This action cannot be undone!
    `;

    const keyboard = {
      inline_keyboard: [[
        { text: '✅ Yes, Delete', callback_data: `confirm_delete_${taskId}` },
        { text: '❌ Cancel', callback_data: `cancel_delete_${taskId}` }
      ]]
    };

    await bot.editMessageText(confirmMessage, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

  } catch (error) {
    console.error('Error showing delete confirmation:', error);
    await bot.sendMessage(chatId, '❌ Error processing delete');
  }
};

// Helper function to execute task deletion
const handleTaskDeleteExecute = async (chatId, messageId, taskId) => {
  try {
    const client = await pool.connect();

    // Get user info
    const userResult = await client.query(`
      SELECT utc.user_id, u.name
      FROM user_telegram_config utc
      JOIN users u ON utc.user_id = u.id
      WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
    `, [chatId]);

    if (userResult.rows.length === 0) {
      client.release();
      await bot.sendMessage(chatId, '❌ Please connect first using /login');
      return;
    }

    const user = userResult.rows[0];

    // Get task for confirmation message
    const taskResult = await client.query(`
      SELECT * FROM tasks
      WHERE id = $1 AND user_id = $2
    `, [taskId, user.user_id]);

    if (taskResult.rows.length === 0) {
      client.release();
      await bot.editMessageText('❌ Task not found', {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }

    const task = taskResult.rows[0];

    // Delete associated reminders first
    await client.query(`
      DELETE FROM reminders WHERE task_id = $1
    `, [taskId]);

    // Delete task
    await client.query(`
      DELETE FROM tasks WHERE id = $1 AND user_id = $2
    `, [taskId, user.user_id]);

    client.release();

    await bot.editMessageText(
      `✅ *Task Deleted*\n\n~~${task.title}~~\n\nThe task and its reminders have been removed.`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown'
      }
    );

  } catch (error) {
    console.error('Error deleting task:', error);
    await bot.sendMessage(chatId, '❌ Error deleting task');
  }
};

// Helper function to show task templates
const showTaskTemplates = async (chatId) => {
  const templates = [
    { type: 'meeting', emoji: '👥', name: 'Meeting', desc: '1-hour meeting template' },
    { type: 'study', emoji: '📚', name: 'Study Session', desc: '2-hour focused learning' },
    { type: 'workout', emoji: '💪', name: 'Workout', desc: '1-hour exercise session' },
    { type: 'break', emoji: '☕', name: 'Break', desc: '15-minute rest break' },
    { type: 'meal', emoji: '🍽️', name: 'Meal Time', desc: '30-minute meal break' },
    { type: 'review', emoji: '📝', name: 'Daily Review', desc: 'End of day review' }
  ];

  let message = '📋 *Task Templates*\n\nChoose a template to quickly add a task:\n\n';

  const buttons = templates.map(t => [{
    text: `${t.emoji} ${t.name}`,
    callback_data: `template_${t.type}`
  }]);

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
};

// Helper function to use task template
const useTaskTemplate = async (chatId, templateType) => {
  const templates = {
    meeting: {
      title: 'Team Meeting',
      description: 'Weekly team sync meeting',
      priority: 'high',
      category: 'work',
      duration: 60
    },
    study: {
      title: 'Study Session',
      description: 'Focused learning time',
      priority: 'medium',
      category: 'learn',
      duration: 120
    },
    workout: {
      title: 'Workout',
      description: 'Exercise session',
      priority: 'medium',
      category: 'rest',
      duration: 60
    },
    break: {
      title: 'Break',
      description: 'Short rest break',
      priority: 'low',
      category: 'rest',
      duration: 15
    },
    meal: {
      title: 'Meal Time',
      description: 'Lunch/Dinner break',
      priority: 'medium',
      category: 'rest',
      duration: 30
    },
    review: {
      title: 'Daily Review',
      description: 'Review today\'s tasks and plan tomorrow',
      priority: 'medium',
      category: 'work',
      duration: 30
    }
  };

  const template = templates[templateType];
  if (!template) {
    await bot.sendMessage(chatId, '❌ Template not found');
    return;
  }

  // Calculate time (start now, end = now + duration)
  const now = new Date();
  const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const endDate = new Date(now.getTime() + template.duration * 60000);
  const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

  const message = `
📋 *Using Template: ${template.title}*

The following task will be created:

📝 *Title:* ${template.title}
📄 *Description:* ${template.description}
📊 *Priority:* ${template.priority}
📁 *Category:* ${template.category}
⏰ *Time:* ${startTime} - ${endTime}

To create this task, send:
\`${template.title} | ${template.description} | ${template.priority} | ${template.category} | ${startTime} | ${endTime}\`

Or customize it before sending!
  `;

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
};

// Helper function for interactive task input (step-by-step)
const handleInteractiveTaskInput = async (chatId, text, userState) => {
  const { step, taskData, userId } = userState;

  try {
    switch (step) {
      case 'title':
        // Save title and ask for description
        taskData.title = text.trim();
        userState.step = 'description';
        userStates.set(chatId, userState);

        await bot.sendMessage(chatId,
          '✅ Title saved!\n\n' +
          '📝 *Step 2/6:* Add a description (optional)\n\n' +
          'Type a brief description, or send "-" to skip.\n\n' +
          '*Example:* Discuss Q4 goals and project updates',
          { parse_mode: 'Markdown' }
        );
        break;

      case 'description':
        // Save description and ask for priority
        taskData.description = text.trim() === '-' ? '' : text.trim();
        userState.step = 'priority';
        userStates.set(chatId, userState);

        await bot.sendMessage(chatId,
          '✅ Description saved!\n\n' +
          '📊 *Step 3/6:* Select priority\n\n' +
          'Choose task priority:',
          { 
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '🔴 High', callback_data: 'priority_high' },
                { text: '🟡 Medium', callback_data: 'priority_medium' },
                { text: '🟢 Low', callback_data: 'priority_low' }
              ]]
            }
          }
        );
        break;

      case 'category':
        // Save category and ask for time start
        taskData.category = text.toLowerCase().trim();
        userState.step = 'time_start';
        userStates.set(chatId, userState);

        await bot.sendMessage(chatId,
          '✅ Category saved!\n\n' +
          '⏰ *Step 5/6:* What time will you start?\n\n' +
          'Enter start time in HH:MM format (24-hour)\n\n' +
          '*Example:* 09:00 or 14:30\n\n' +
          '⚠️ *Required for reminders!*',
          { parse_mode: 'Markdown' }
        );
        break;

      case 'time_start':
        // Validate and save time start
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(text.trim())) {
          await bot.sendMessage(chatId,
            '❌ Invalid time format!\n\n' +
            'Please use HH:MM format (24-hour)\n\n' +
            '*Examples:* 09:00, 14:30, 23:45',
            { parse_mode: 'Markdown' }
          );
          return;
        }

        taskData.time_start = text.trim();
        userState.step = 'time_end';
        userStates.set(chatId, userState);

        await bot.sendMessage(chatId,
          '✅ Start time saved!\n\n' +
          '⏰ *Step 6/6:* When will it end? (optional)\n\n' +
          'Enter end time in HH:MM format, or send "-" to skip.\n\n' +
          '*Example:* 10:00',
          { parse_mode: 'Markdown' }
        );
        break;

      case 'time_end':
        // Validate and save time end, then create task
        if (text.trim() !== '-') {
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(text.trim())) {
            await bot.sendMessage(chatId,
              '❌ Invalid time format!\n\n' +
              'Please use HH:MM format or send "-" to skip.',
              { parse_mode: 'Markdown' }
            );
            return;
          }
          taskData.time_end = text.trim();
        } else {
          taskData.time_end = null;
        }

        // Create the task
        await createTaskFromInteractive(chatId, taskData, userId);
        userStates.delete(chatId);
        break;

      default:
        await bot.sendMessage(chatId, '❌ Unknown step. Please start again with /quickadd');
        userStates.delete(chatId);
    }
  } catch (error) {
    console.error('Error in interactive task input:', error);
    await bot.sendMessage(chatId, '❌ Error processing input. Please try /quickadd again.');
    userStates.delete(chatId);
  }
};

// Helper function to create task from interactive input
const createTaskFromInteractive = async (chatId, taskData, userId) => {
  try {
    // If this chat was marked to attach the next created task to a routine template,
    // call the routine-specific creator instead and clear the flag.
    if (routineAttachMap.has(chatId)) {
      const routineId = routineAttachMap.get(chatId);
      try {
        const client = await pool.connect();
        const res = await client.query('SELECT name FROM routine_templates WHERE id = $1 AND user_id = $2', [routineId, userId]);
        client.release();

        const routineName = res.rows.length ? res.rows[0].name : 'Routine';

        // Delegate creation to the routine task creator
        await createRoutineTaskFromInteractive(chatId, taskData, routineId, routineName, userId);
        routineAttachMap.delete(chatId);
        return;
      } catch (err) {
        console.error('Error attaching task to routine:', err);
        // Fall through to normal task creation if anything fails
      }
    }
    const { v4: uuidv4 } = await import('uuid');
    const taskId = uuidv4();

    const client = await pool.connect();

    // Insert task
    const insertResult = await client.query(`
      INSERT INTO tasks (id, user_id, title, description, status, priority, category, time_start, time_end, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      taskId,
      userId,
      taskData.title,
      taskData.description || '',
      'pending',
      taskData.priority || 'medium',
      taskData.category || 'work',
      taskData.time_start,
      taskData.time_end
    ]);

    const task = insertResult.rows[0];

    // Schedule reminders
    try {
      const reminderService = await import('../services/reminderService.js');
      await reminderService.scheduleRemindersForTask({
        ...task,
        time_start: taskData.time_start
      });
      console.log(`⏰ Reminders scheduled for task ${taskId}`);
    } catch (reminderError) {
      console.error('⚠️ Failed to schedule reminders:', reminderError);
    }

    client.release();

    const emoji = taskData.priority === 'high' ? '🔴' : taskData.priority === 'medium' ? '🟡' : '🟢';
    const categoryEmoji = taskData.category === 'work' ? '💼' : taskData.category === 'learn' ? '📚' : '🧘';

    const successMessage = `
✅ *Task Created Successfully!*

${categoryEmoji} *${task.title}*
${task.description ? `_${task.description}_\n` : ''}
${emoji} *Priority:* ${task.priority.toUpperCase()}
📁 *Category:* ${task.category}
⏰ *Time:* ${task.time_start}${task.time_end ? ` - ${task.time_end}` : ''}
⏰ *Reminders:* Scheduled

*Quick Add completed!* 🎉

Use /quickadd again to add another task, or /mytasks to view all tasks.
    `;

    await bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Error creating task from interactive input:', error);
    await bot.sendMessage(chatId, '❌ Error creating task. Please try again.');
  }
};

// Helper function for interactive routine input (step-by-step)
const handleInteractiveRoutineInput = async (chatId, text, userState) => {
  const { step, routineData, tasks, userId } = userState;

  try {
    switch (step) {
      case 'name':
        // Save name and ask for description
        routineData.name = text.trim();
        userState.step = 'description';
        userStates.set(chatId, userState);

        await bot.sendMessage(chatId,
          '✅ Routine name saved!\n\n' +
          '📝 *Step 2/2:* Add a description (optional)\n\n' +
          'Type a brief description, or send "-" to skip.\n\n' +
          '*Example:* Daily morning productivity routine',
          { parse_mode: 'Markdown' }
        );
        break;

      case 'description':
        // Save description and create routine
        routineData.description = text.trim() === '-' ? '' : text.trim();
        
        // Create the routine
        const routineId = await createRoutineFromInteractive(chatId, routineData, userId);
        
        if (routineId) {
          // Ask if user wants to add tasks
          userState.routineId = routineId;
          userState.step = 'add_task_prompt';
          userStates.set(chatId, userState);

          await bot.sendMessage(chatId,
            '✅ *Routine Created Successfully!*\n\n' +
            `📋 *${routineData.name}*\n` +
            `${routineData.description ? `_${routineData.description}_\n\n` : '\n'}` +
            'Would you like to add tasks to this routine?',
            { 
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[
                  { text: '➕ Yes, Add Tasks', callback_data: `add_task_to_new_routine_${routineId}` },
                  { text: '✅ No, Done', callback_data: 'routine_done' }
                ]]
              }
            }
          );
        } else {
          userStates.delete(chatId);
        }
        break;

      default:
        await bot.sendMessage(chatId, '❌ Unknown step. Please start again with /quickroutine');
        userStates.delete(chatId);
    }
  } catch (error) {
    console.error('Error in interactive routine input:', error);
    await bot.sendMessage(chatId, '❌ Error processing input. Please try /quickroutine again.');
    userStates.delete(chatId);
  }
};

// Helper function to create routine from interactive input
const createRoutineFromInteractive = async (chatId, routineData, userId) => {
  try {
    const { v4: uuidv4 } = await import('uuid');
    const routineId = uuidv4();

    const client = await pool.connect();

    // Insert routine template
    const insertResult = await client.query(`
      INSERT INTO routine_templates (id, user_id, name, description, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      routineId,
      userId,
      routineData.name,
      routineData.description || ''
    ]);

    client.release();

    console.log(`✅ Routine created: ${routineId}`);
    return routineId;

  } catch (error) {
    console.error('Error creating routine from interactive input:', error);
    await bot.sendMessage(chatId, '❌ Error creating routine. Please try again.');
    return null;
  }
};

// Helper function to handle routine edit input
const handleRoutineEditInput = async (chatId, text, userState) => {
  const { routineId, userId } = userState;

  try {
    const parts = text.split('|').map(p => p.trim());
    const name = parts[0] || null;
    const description = parts.slice(1).join(' | ') || null;

    const routineModel = await import('../models/routineModel.js');

    const updated = await routineModel.updateRoutineTemplate(routineId, userId, {
      name: name === '' ? null : name,
      description: description === '' ? null : description
    });

    if (!updated) {
      await bot.sendMessage(chatId, '⚠️ Routine not found or you do not have permission to edit it.');
      return;
    }

    await bot.sendMessage(chatId, `✅ Routine updated!\n*${updated.name}*\n_${updated.description || ''}_`, { parse_mode: 'Markdown' });

  } catch (err) {
    console.error('Error updating routine:', err);
    await bot.sendMessage(chatId, '❌ Error updating routine. Please try again.');
  }
};

// Helper function for interactive routine task input (step-by-step)
const handleInteractiveRoutineTaskInput = async (chatId, text, userState) => {
  const { step, taskData, routineId, routineName, userId } = userState;

  try {
    switch (step) {
      case 'title':
        // Save title and ask for description
        taskData.title = text.trim();
        userState.step = 'description';
        userStates.set(chatId, userState);

        await bot.sendMessage(chatId,
          '✅ Task title saved!\n\n' +
          '📝 *Step 2/6:* Add a description (optional)\n\n' +
          'Type a brief description, or send "-" to skip.\n\n' +
          '*Example:* 30 minutes cardio workout',
          { parse_mode: 'Markdown' }
        );
        break;

      case 'description':
        // Save description and ask for priority
        taskData.description = text.trim() === '-' ? '' : text.trim();
        userState.step = 'priority';
        userStates.set(chatId, userState);

        await bot.sendMessage(chatId,
          '✅ Description saved!\n\n' +
          '⚡ *Step 3/6:* Select task priority',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔴 High', callback_data: 'priority_high' },
                  { text: '🟡 Medium', callback_data: 'priority_medium' },
                  { text: '🟢 Low', callback_data: 'priority_low' }
                ]
              ]
            }
          }
        );
        break;

      case 'category':
        // Priority already set by callback, now ask for category
        // This step is handled by callback, but included for completeness
        await bot.sendMessage(chatId,
          '✅ Priority saved!\n\n' +
          '📂 *Step 4/6:* Select task category',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '💼 Work', callback_data: 'category_work' },
                  { text: '📚 Learn', callback_data: 'category_learn' },
                  { text: '🌴 Rest', callback_data: 'category_rest' }
                ]
              ]
            }
          }
        );
        break;

      case 'time_start':
        // Validate time format
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(text.trim())) {
          await bot.sendMessage(chatId,
            '❌ Invalid time format!\n\n' +
            'Please use HH:MM format (e.g., 09:00, 14:30)\n' +
            'Or send "-" to skip.',
            { parse_mode: 'Markdown' }
          );
          return;
        }

        taskData.time_start = text.trim() === '-' ? null : text.trim();
        userState.step = 'time_end';
        userStates.set(chatId, userState);

        await bot.sendMessage(chatId,
          '✅ Start time saved!\n\n' +
          '🕐 *Step 6/6:* What time does this task end? (optional)\n\n' +
          'Send time in HH:MM format, or "-" to skip.\n\n' +
          '*Example:* 07:00',
          { parse_mode: 'Markdown' }
        );
        break;

      case 'time_end':
        // Validate time format if provided
        if (text.trim() !== '-') {
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(text.trim())) {
            await bot.sendMessage(chatId,
              '❌ Invalid time format!\n\n' +
              'Please use HH:MM format (e.g., 09:00, 14:30)\n' +
              'Or send "-" to skip.',
              { parse_mode: 'Markdown' }
            );
            return;
          }
        }

        taskData.time_end = text.trim() === '-' ? null : text.trim();

        // Create the routine task
        await createRoutineTaskFromInteractive(chatId, taskData, routineId, routineName, userId);
        break;

      default:
        await bot.sendMessage(chatId, '❌ Unknown step. Please start again with /quickaddtask');
        userStates.delete(chatId);
    }
  } catch (error) {
    console.error('Error in interactive routine task input:', error);
    await bot.sendMessage(chatId, '❌ Error processing input. Please try /quickaddtask again.');
    userStates.delete(chatId);
  }
};

// Helper function to create routine task from interactive input
const createRoutineTaskFromInteractive = async (chatId, taskData, routineId, routineName, userId) => {
  try {
    const { v4: uuidv4 } = await import('uuid');
    const taskId = uuidv4();

    const client = await pool.connect();

    // Insert routine template task
    await client.query(`
      INSERT INTO routine_template_tasks 
      (id, routine_template_id, title, description, priority, category, time_start, time_end, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      taskId,
      routineId,
      taskData.title,
      taskData.description || '',
      taskData.priority || 'medium',
      taskData.category || 'work',
      taskData.time_start || null,
      taskData.time_end || null
    ]);

    client.release();

    console.log(`✅ Routine task created: ${taskId}`);

    // Build success message
    const priorityEmoji = {
      high: '🔴',
      medium: '🟡',
      low: '🟢'
    };

    const categoryEmoji = {
      work: '💼',
      learn: '📚',
      rest: '🌴'
    };

    let successMessage = 
      '✅ *Task Added to Routine!*\n\n' +
      `📋 Routine: *${routineName}*\n\n` +
      `📌 *${taskData.title}*\n`;

    if (taskData.description) {
      successMessage += `_${taskData.description}_\n\n`;
    }

    successMessage += 
      `${priorityEmoji[taskData.priority || 'medium']} Priority: ${taskData.priority || 'medium'}\n` +
      `${categoryEmoji[taskData.category || 'work']} Category: ${taskData.category || 'work'}\n`;

    if (taskData.time_start) {
      successMessage += `🕐 Time: ${taskData.time_start}`;
      if (taskData.time_end) {
        successMessage += ` - ${taskData.time_end}`;
      }
      successMessage += '\n';
    }

    // Ask if user wants to add more tasks
    successMessage += '\n\nWould you like to add another task?';

    await bot.sendMessage(chatId, successMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '➕ Add Another Task', callback_data: `select_routine_for_task_${routineId}` },
          { text: '✅ Done', callback_data: 'routine_done' }
        ]]
      }
    });

    // Clear state
    userStates.delete(chatId);

  } catch (error) {
    console.error('Error creating routine task from interactive input:', error);
    await bot.sendMessage(chatId, '❌ Error creating task. Please try again.');
    userStates.delete(chatId);
  }
};

// Helper function to generate all routines
const handleGenerateAllRoutines = async (chatId) => {
  try {
    const client = await pool.connect();

    // Get user info
    const userResult = await client.query(`
      SELECT utc.user_id, u.name
      FROM user_telegram_config utc
      JOIN users u ON utc.user_id = u.id
      WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
    `, [chatId]);

    if (userResult.rows.length === 0) {
      client.release();
      await bot.sendMessage(chatId, '❌ Please connect first using /login');
      return;
    }

    const user = userResult.rows[0];

    // Get all active routines
    const routinesResult = await client.query(`
      SELECT * FROM routine_templates
      WHERE user_id = $1 AND is_active = true
    `, [user.user_id]);

    if (routinesResult.rows.length === 0) {
      client.release();
      await bot.sendMessage(chatId, '❌ No active routines found');
      return;
    }

    let totalTasksGenerated = 0;
    const routineNames = [];

    // Generate tasks from each routine
    for (const routine of routinesResult.rows) {
      try {
        // Import routine service
        const routineService = await import('../services/routineService.js');
        
        // Generate tasks
        const result = await routineService.generateDailyRoutine(user.user_id, routine.id);
        
        if (result.success) {
          totalTasksGenerated += result.tasksGenerated || 0;
          routineNames.push(routine.name);
        }
      } catch (error) {
        console.error(`Error generating routine ${routine.name}:`, error);
      }
    }

    client.release();

    if (totalTasksGenerated === 0) {
      await bot.sendMessage(chatId,
        '⚠️ No new tasks generated.\n\nRoutines may have already been generated today.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await bot.sendMessage(chatId,
      `✅ *All Routines Generated!*\n\n` +
      `🗓️ Routines: ${routineNames.join(', ')}\n` +
      `📋 *${totalTasksGenerated} tasks* added to your list\n\n` +
      `Use /today to see your tasks!`,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Error generating all routines:', error);
    await bot.sendMessage(chatId, '❌ Error generating routines');
  }
};

// Helper function to handle priority selection
const handlePrioritySelection = async (chatId, priority) => {
  const userState = userStates.get(chatId);
  
  // Accept priority selection for both regular interactive task and routine-interactive task
  if (!userState || (userState.action !== 'awaiting_interactive_task' && userState.action !== 'awaiting_interactive_routine_task') || userState.step !== 'priority') {
    await bot.sendMessage(chatId, '❌ Invalid state. Please start again with /quickadd');
    return;
  }

  // Save priority and move to category
  userState.taskData.priority = priority;
  userState.step = 'category';
  userStates.set(chatId, userState);

  const priorityEmoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';

  await bot.sendMessage(chatId,
    `✅ Priority set to ${priorityEmoji} ${priority}!\n\n` +
    '📁 *Step 4/6:* Select category\n\n' +
    'Choose task category:',
    { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '💼 Work', callback_data: 'category_work' },
          { text: '📚 Learn', callback_data: 'category_learn' },
          { text: '🧘 Rest', callback_data: 'category_rest' }
        ]]
      }
    }
  );
};

// Helper function to handle category selection
const handleCategorySelection = async (chatId, category) => {
  const userState = userStates.get(chatId);
  
  // Accept category selection for both regular interactive task and routine-interactive task
  if (!userState || (userState.action !== 'awaiting_interactive_task' && userState.action !== 'awaiting_interactive_routine_task') || userState.step !== 'category') {
    await bot.sendMessage(chatId, '❌ Invalid state. Please start again with /quickadd');
    return;
  }

  // Save category and move to time_start
  userState.taskData.category = category;
  userState.step = 'time_start';
  userStates.set(chatId, userState);

  const categoryEmoji = category === 'work' ? '💼' : category === 'learn' ? '📚' : '🧘';

  await bot.sendMessage(chatId,
    `✅ Category set to ${categoryEmoji} ${category}!\n\n` +
    '⏰ *Step 5/6:* What time will you start?\n\n' +
    'Enter start time in HH:MM format (24-hour)\n\n' +
    '*Example:* 09:00 or 14:30\n\n' +
    '⚠️ *Required for reminders!*',
    { parse_mode: 'Markdown' }
  );
};

// Helper function to handle task input
const handleTaskInput = async (chatId, input, userId, userName) => {
  try {
    console.log(`🔧 handleTaskInput called for user ${userId} (${userName})`);
    console.log(`📝 Input: "${input}"`);
    
    const parts = input.split('|').map(p => p.trim());
    console.log(`📋 Parts:`, parts);

    const title = parts[0];
    const description = parts[1] || '';
    const priority = parts[2] || 'medium';
    const category = parts[3] || 'work';
    const timeStart = parts[4] || null;
    const timeEnd = parts[5] || null;

    console.log(`📌 Parsed - Title: "${title}", Desc: "${description}", Priority: "${priority}", Category: "${category}", TimeStart: "${timeStart}", TimeEnd: "${timeEnd}"`);

    // Validate priority
    const validPriorities = ['high', 'medium', 'low'];
    const finalPriority = validPriorities.includes(priority.toLowerCase()) ? priority.toLowerCase() : 'medium';

    // Validate category - sesuai dengan database constraint
    const validCategories = ['work', 'learn', 'rest'];
    const finalCategory = validCategories.includes(category.toLowerCase()) ? category.toLowerCase() : 'work';

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const finalTimeStart = timeStart && timeRegex.test(timeStart) ? timeStart : null;
    const finalTimeEnd = timeEnd && timeRegex.test(timeEnd) ? timeEnd : null;

    console.log(`✅ Validated - Priority: "${finalPriority}", Category: "${finalCategory}", TimeStart: "${finalTimeStart}", TimeEnd: "${finalTimeEnd}"`);

    if (!title) {
      console.log(`❌ Title is empty!`);
      await bot.sendMessage(chatId,
        '❌ Task title is required! Please try /addtask again.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Check if time_start is provided (required for reminders)
    if (!finalTimeStart) {
      console.log(`⚠️ No valid time_start provided`);
      await bot.sendMessage(chatId,
        '⚠️ *Time Start Required for Reminders*\n\n' +
        'Please include start time in format HH:MM (24-hour format)\n\n' +
        '*Example:*\n' +
        '\`Meeting | Discuss project | high | work | 09:00 | 10:00\`\n' +
        '\`Study | Learn Python | medium | learn | 14:30 | 16:00\`\n\n' +
        'Try again with /addtaskraw',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Import uuid
    const { v4: uuidv4 } = await import('uuid');
    const taskId = uuidv4();
    console.log(`🆔 Generated task ID: ${taskId}`);

    const client = await pool.connect();
    console.log(`🔌 Database connected`);

    // Insert task
    const insertResult = await client.query(`
      INSERT INTO tasks (id, user_id, title, description, status, priority, category, time_start, time_end, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [taskId, userId, title, description, 'pending', finalPriority, finalCategory, finalTimeStart, finalTimeEnd]);

    console.log(`💾 Task inserted:`, insertResult.rows[0]);

    const task = insertResult.rows[0];

    // Schedule reminders for the new task
    try {
      const reminderService = await import('../services/reminderService.js');
      await reminderService.scheduleRemindersForTask({
        ...task,
        time_start: finalTimeStart
      });
      console.log(`⏰ Reminders scheduled for task ${taskId}`);
    } catch (reminderError) {
      console.error('⚠️ Failed to schedule reminders:', reminderError);
      // Continue even if reminder scheduling fails
    }

    client.release();
    console.log(`🔌 Database connection released`);

    const emoji = finalPriority === 'high' ? '🔴' : finalPriority === 'medium' ? '🟡' : '🟢';
    const categoryEmoji = finalCategory === 'work' ? '💼' : finalCategory === 'learn' ? '📚' : '🧘';

    const successMessage = `
✅ *Task Added Successfully!*

${categoryEmoji} *${task.title}*
${task.description ? `_${task.description}_\n` : ''}
${emoji} *Priority:* ${finalPriority.toUpperCase()}
📁 *Category:* ${finalCategory}
🕐 *Time:* ${finalTimeStart}${finalTimeEnd ? ` - ${finalTimeEnd}` : ''}
📊 *Status:* Pending
⏰ *Reminders:* Scheduled

Your task has been created and reminders are set! 🎉

Use /today to see all your tasks for today.
    `;

    console.log(`📤 Sending success message...`);
    await bot.sendMessage(chatId, successMessage, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '➕ Add Another Task', callback_data: 'cmd_addtask' },
          { text: '📅 View Today\'s Tasks', callback_data: 'cmd_today' }
        ]]
      }
    });
    console.log(`✅ Success message sent!`);

  } catch (error) {
    console.error('❌ Error creating task:', error);
    console.error('Stack trace:', error.stack);
    await bot.sendMessage(chatId,
      `❌ Failed to create task: ${error.message}\n\nPlease try again.`,
      { parse_mode: 'Markdown' }
    );
  }
};

// Helper function to handle task edit
const handleTaskEdit = async (chatId, input, userId, taskId, currentTask) => {
  try {
    console.log(`🔧 handleTaskEdit called for task ${taskId}`);
    console.log(`📝 Input: "${input}"`);
    
    const parts = input.split('|').map(p => p.trim());

    // Parse input - use current values as defaults for empty fields
    const title = parts[0] || currentTask.title;
    const description = parts[1] !== undefined && parts[1] !== '' ? parts[1] : currentTask.description;
    const priority = parts[2] || currentTask.priority;
    const category = parts[3] || currentTask.category;
    const timeStart = parts[4] !== undefined && parts[4] !== '' ? parts[4] : currentTask.time_start;
    const timeEnd = parts[5] !== undefined && parts[5] !== '' ? parts[5] : currentTask.time_end;
    const status = parts[6] || currentTask.status;

    console.log(`📌 Parsed - Title: "${title}", Priority: "${priority}", Category: "${category}", Status: "${status}"`);

    // Validate priority
    const validPriorities = ['high', 'medium', 'low'];
    const finalPriority = validPriorities.includes(priority.toLowerCase()) ? priority.toLowerCase() : currentTask.priority;

    // Validate category
    const validCategories = ['work', 'learn', 'rest'];
    const finalCategory = validCategories.includes(category.toLowerCase()) ? category.toLowerCase() : currentTask.category;

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'done'];
    const finalStatus = validStatuses.includes(status.toLowerCase()) ? status.toLowerCase() : currentTask.status;

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const finalTimeStart = timeStart && timeRegex.test(timeStart) ? timeStart : currentTask.time_start;
    const finalTimeEnd = timeEnd && timeRegex.test(timeEnd) ? timeEnd : currentTask.time_end;

    if (!title) {
      await bot.sendMessage(chatId,
        '❌ Task title cannot be empty! Please try again.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Check if time_start is provided (required for reminders)
    if (!finalTimeStart) {
      console.log(`⚠️ Warning: No time_start for edited task`);
      await bot.sendMessage(chatId,
        '⚠️ *Time Start Recommended*\n\n' +
        'Task reminders work best with a start time.\n' +
        'Do you want to continue without time_start?\n\n' +
        'Reply "yes" to continue or /cancel to abort.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const client = await pool.connect();

    // Update task
    const updateResult = await client.query(`
      UPDATE tasks 
      SET title = $1, 
          description = $2, 
          priority = $3, 
          category = $4, 
          time_start = $5, 
          time_end = $6, 
          status = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 AND user_id = $9
      RETURNING *
    `, [title, description, finalPriority, finalCategory, finalTimeStart, finalTimeEnd, finalStatus, taskId, userId]);

    console.log(`💾 Task updated:`, updateResult.rows[0]);

    const task = updateResult.rows[0];

    // Reschedule reminders if time changed and status is not done
    if (finalStatus !== 'done' && finalTimeStart) {
      try {
        const reminderService = await import('../services/reminderService.js');
        // Delete old reminders
        await client.query(`
          DELETE FROM reminders 
          WHERE task_id = $1 AND status = 'pending'
        `, [taskId]);
        
        // Schedule new reminders
        await reminderService.scheduleRemindersForTask({
          ...task,
          time_start: finalTimeStart
        });
        console.log(`⏰ Reminders rescheduled for task ${taskId}`);
      } catch (reminderError) {
        console.error('⚠️ Failed to reschedule reminders:', reminderError);
      }
    }

    client.release();

    const emoji = finalPriority === 'high' ? '🔴' : finalPriority === 'medium' ? '🟡' : '🟢';
    const categoryEmoji = finalCategory === 'work' ? '💼' : finalCategory === 'learn' ? '📚' : '🧘';
    const statusEmoji = finalStatus === 'done' ? '✅' : finalStatus === 'in_progress' ? '🔄' : '📋';

    // Show what changed
    let changesMessage = '';
    if (title !== currentTask.title) changesMessage += `📝 Title updated\n`;
    if (description !== currentTask.description) changesMessage += `📄 Description updated\n`;
    if (finalPriority !== currentTask.priority) changesMessage += `📊 Priority changed: ${currentTask.priority} → ${finalPriority}\n`;
    if (finalCategory !== currentTask.category) changesMessage += `📁 Category changed: ${currentTask.category} → ${finalCategory}\n`;
    if (finalTimeStart !== currentTask.time_start) changesMessage += `⏰ Start time updated\n`;
    if (finalTimeEnd !== currentTask.time_end) changesMessage += `⏰ End time updated\n`;
    if (finalStatus !== currentTask.status) changesMessage += `📊 Status changed: ${currentTask.status} → ${finalStatus}\n`;

    const successMessage = `
✅ *Task Updated Successfully!*

${statusEmoji} ${categoryEmoji} *${task.title}*
${task.description ? `_${task.description}_\n` : ''}
${emoji} *Priority:* ${finalPriority.toUpperCase()}
📁 *Category:* ${finalCategory}
🕐 *Time:* ${finalTimeStart}${finalTimeEnd ? ` - ${finalTimeEnd}` : ''}
📊 *Status:* ${finalStatus}
${finalStatus !== 'done' && finalTimeStart ? '⏰ *Reminders:* Rescheduled' : ''}

*Changes Made:*
${changesMessage || 'No changes detected'}

Use /today to see your updated task list.
    `;

    await bot.sendMessage(chatId, successMessage, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '✏️ Edit Again', callback_data: 'cmd_edittask' },
          { text: '📅 Today\'s Tasks', callback_data: 'cmd_today' }
        ]]
      }
    });

  } catch (error) {
    console.error('❌ Error updating task:', error);
    await bot.sendMessage(chatId,
      `❌ Failed to update task: ${error.message}\n\nPlease try again.`,
      { parse_mode: 'Markdown' }
    );
  }
};

// Helper function to handle routine creation
const handleRoutineCreation = async (chatId, input, userId, userName) => {
  try {
    console.log(`🔧 handleRoutineCreation called for user ${userId} (${userName})`);
    console.log(`📝 Input: "${input}"`);
    
    const parts = input.split('|').map(p => p.trim());
    const name = parts[0];
    const description = parts[1] || '';

    if (!name) {
      await bot.sendMessage(chatId,
        '❌ Routine name is required! Please try /createroutine again.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Import uuid and create routine
    const { v4: uuidv4 } = await import('uuid');
    const routineId = uuidv4();

    const client = await pool.connect();

    const insertResult = await client.query(`
      INSERT INTO routine_templates (id, user_id, name, description, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING *
    `, [routineId, userId, name, description]);

    client.release();

    const routine = insertResult.rows[0];

    const successMessage = `
✅ *Routine Template Created!*

📋 *${routine.name}*
${routine.description ? `_${routine.description}_\n` : ''}
🆔 ID: \`${routine.id}\`

*Next Steps:*
1. Add tasks to this routine:
   \`/addtasktoroutine ${routine.id}\`

2. View your routines:
   \`/myroutines\`

3. Generate daily tasks:
   \`/generateroutine ${routine.id}\`
    `;

    await bot.sendMessage(chatId, successMessage, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '➕ Add Task to Routine', callback_data: `add_task_routine_${routine.id}` },
          { text: '📋 My Routines', callback_data: 'cmd_myroutines' }
        ]]
      }
    });

  } catch (error) {
    console.error('❌ Error creating routine:', error);
    await bot.sendMessage(chatId,
      `❌ Failed to create routine: ${error.message}\n\nPlease try again.`,
      { parse_mode: 'Markdown' }
    );
  }
};

// Helper function to handle routine task input
const handleRoutineTaskInput = async (chatId, input, userId, routineId, routineName) => {
  try {
    console.log(`🔧 handleRoutineTaskInput called for routine ${routineId}`);
    console.log(`📝 Input: "${input}"`);
    
    const parts = input.split('|').map(p => p.trim());

    const title = parts[0];
    const description = parts[1] || '';
    const priority = parts[2] || 'medium';
    const category = parts[3] || 'work';
    const timeStart = parts[4] || null;
    const timeEnd = parts[5] || null;

    // Validate priority
    const validPriorities = ['high', 'medium', 'low'];
    const finalPriority = validPriorities.includes(priority.toLowerCase()) ? priority.toLowerCase() : 'medium';

    // Validate category
    const validCategories = ['work', 'learn', 'rest'];
    const finalCategory = validCategories.includes(category.toLowerCase()) ? category.toLowerCase() : 'work';

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const finalTimeStart = timeStart && timeRegex.test(timeStart) ? timeStart : null;
    const finalTimeEnd = timeEnd && timeRegex.test(timeEnd) ? timeEnd : null;

    if (!title) {
      await bot.sendMessage(chatId,
        '❌ Task title is required! Please try again.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // ⚠️ VALIDASI WAJIB: time_start harus diisi untuk reminder system
    if (!finalTimeStart) {
      console.log(`⚠️ No valid time_start provided for routine task`);
      await bot.sendMessage(chatId,
        '⚠️ *Time Start Required for Reminder System*\n\n' +
        'Routine tasks MUST have a start time for reminders to work!\n\n' +
        '*Correct Format:*\n' +
        '\`Title | Description | Priority | Category | TimeStart | TimeEnd\`\n\n' +
        '*Examples:*\n' +
        '\`Exercise | Morning workout | high | rest | 06:00 | 06:30\`\n' +
        '\`Check Email | Review inbox | medium | work | 09:00 | 09:30\`\n' +
        '\`Study | Learn new skills | high | learn | 14:00 | 16:00\`\n\n' +
        '⏰ TimeStart format: HH:MM (24-hour, required)\n' +
        '⏰ TimeEnd format: HH:MM (24-hour, optional)\n\n' +
        'Please try again with valid time.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Import uuid and create routine task
    const { v4: uuidv4 } = await import('uuid');
    const taskId = uuidv4();

    const client = await pool.connect();

    // Get current max order_index
    const orderResult = await client.query(`
      SELECT COALESCE(MAX(order_index), -1) + 1 as next_order
      FROM routine_template_tasks
      WHERE routine_template_id = $1
    `, [routineId]);

    const orderIndex = orderResult.rows[0].next_order;

    const insertResult = await client.query(`
      INSERT INTO routine_template_tasks 
        (id, routine_template_id, title, description, category, priority, time_start, time_end, order_index, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      RETURNING *
    `, [taskId, routineId, title, description, finalCategory, finalPriority, finalTimeStart, finalTimeEnd, orderIndex]);

    client.release();

    const task = insertResult.rows[0];

    const successMessage = `
✅ *Task Added to Routine!*

📋 *Routine:* ${routineName}

📝 *Task:* ${task.title}
${task.description ? `_${task.description}_\n` : ''}
📊 *Priority:* ${task.priority}
📁 *Category:* ${task.category}
⏰ *Time:* ${task.time_start}${task.time_end ? ` - ${task.time_end}` : ''}
⏰ *Reminders:* Will be scheduled when generated

*Add More Tasks:*
\`/addtasktoroutine ${routineId}\`

*View Routine:*
\`/myroutines\`
    `;

    await bot.sendMessage(chatId, successMessage, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '➕ Add Another Task', callback_data: `add_task_routine_${routineId}` },
          { text: '📋 My Routines', callback_data: 'cmd_myroutines' }
        ]]
      }
    });

  } catch (error) {
    console.error('❌ Error adding task to routine:', error);
    await bot.sendMessage(chatId,
      `❌ Failed to add task: ${error.message}\n\nPlease try again.`,
      { parse_mode: 'Markdown' }
    );
  }
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