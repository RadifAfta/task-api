import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { pool } from '../config/db.js';
import {
  createTransactionService,
  getTransactionsService,
  getTransactionSummaryService,
  createQuickIncomeService,
  createQuickExpenseService
} from './transactionService.js';
import UserService from './userService.js';
import TelegramView from '../views/telegramView.js';

dotenv.config();

let bot = null;
let isInitialized = false;

// Store user states for multi-step commands
const userStates = new Map();
// Map to indicate that the next interactive /addtask for a chat should be attached to a routine
const routineAttachMap = new Map();
// Store login timeouts
const loginTimeouts = new Map();

/**
 * Levi - LifePath Smart Reminder System
 * Your personal productivity companion 🤖
 * 
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

    console.log('🤖 Levi initialized successfully');

    // Set bot commands menu
    setupBotCommands();

    // Setup bot command handlers
    setupBotHandlers();

    isInitialized = true;
    return bot;

  } catch (error) {
    console.error('❌ Failed to initialize Levi:', error.message);
    return null;
  }
};

// Setup bot commands menu (appears in Telegram menu)
const setupBotCommands = async () => {
  if (!bot) return;

  try {
    await bot.setMyCommands([
      { command: 'start', description: '🌟 Welcome message & auto setup' },
      { command: 'quick', description: '⚡ Quick task actions' },
      { command: 'addtask', description: '➕ Add task (interactive)' },
      { command: 'addroutine', description: '📋 Add routine (interactive)' },
      { command: 'managetasks', description: '🛠️ Manage your tasks (edit/delete)' },
      { command: 'manageroutines', description: '🛠️ Manage your routines (edit/delete)' },
      { command: 'mytasks', description: '📋 My tasks with actions' },
      { command: 'today', description: '📅 View today\'s tasks' },
      { command: 'complete', description: '✅ Mark task as done' },
      { command: 'myroutines', description: '📋 View my routines' },
      { command: 'transactions', description: '💰 View my transactions' },
      { command: 'transactions_today', description: '📅 View today\'s transactions' },
      { command: 'transaction_summary', description: '📊 Financial summary' },
      { command: 'income', description: '📈 Quick income entry (/income amount)' },
      { command: 'expense', description: '📉 Quick expense entry (/expense amount)' },
      { command: 'menu', description: '📋 Show command menu' }
    ]);

    console.log('✅ Levi command menu registered');
  } catch (error) {
    console.error('❌ Failed to set bot commands:', error);
  }
};

// Process registration input
const processRegistration = async (chatId, input) => {
  try {
    // Parse registration input (Name | Email | Password)
    const parts = input.split('|').map(part => part.trim());

    if (parts.length !== 3) {
      await bot.sendMessage(chatId,
        '❌ *Invalid Format*\n\n' +
        'Please use this format:\n' +
        '`Name | Email | Password`\n\n' +
        '*Example:*\n' +
        '`Radif Aftamaulana | radifam12@gmail.com | mypassword123`\n\n' +
        'Try again with /register Name | Email | Password.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const [name, email, password] = parts;

    // Validate inputs
    if (name.length < 2 || name.length > 100) {
      await bot.sendMessage(chatId,
        '❌ *Invalid Name*\n\n' +
        'Name must be 2-100 characters long.\n' +
        'Please try again.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await bot.sendMessage(chatId,
        '❌ *Invalid Email*\n\n' +
        'Please provide a valid email address.\n' +
        'Please try again.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    if (password.length < 6) {
      await bot.sendMessage(chatId,
        '❌ *Password Too Short*\n\n' +
        'Password must be at least 6 characters long.\n' +
        'Please try again.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Check if email already exists (case-insensitive)
    const client = await pool.connect();
    const existingUser = await client.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existingUser.rows.length > 0) {
      await bot.sendMessage(chatId,
        '❌ *Email Already Registered*\n\n' +
        'This email is already registered in LifePath.\n' +
        'Use /login to connect your existing account.',
        { parse_mode: 'Markdown' }
      );
      client.release();
      return;
    }

    // Check if telegram chat_id already exists
    const existingTelegramConfig = await client.query(
      'SELECT user_id FROM user_telegram_config WHERE telegram_chat_id = $1',
      [chatId]
    );

    if (existingTelegramConfig.rows.length > 0) {
      await bot.sendMessage(chatId,
        '❌ *Telegram Chat Already Registered*\n\n' +
        'This Telegram chat is already linked to an account.\n' +
        'Use /login to connect or /logout to disconnect.',
        { parse_mode: 'Markdown' }
      );
      client.release();
      return;
    }

    // Hash password
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash(password, 10);

    // Create new user
    const newUserResult = await client.query(`
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email
    `, [name, email.toLowerCase(), hashedPassword]);

    const newUser = newUserResult.rows[0];

    // Create telegram config for the new user
    await client.query(`
      INSERT INTO user_telegram_config (user_id, telegram_chat_id, telegram_username, is_verified, is_active)
      VALUES ($1, $2, $3, true, true)
    `, [newUser.id, chatId, null]); // username will be null for now

    // Create default reminder settings
    await client.query(`
      INSERT INTO reminder_settings (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [newUser.id]);

    client.release();

    const successMessage = `
✅ *Registration Successful!*

Greetings, My Lord ${newUser.name}! 🎉

Your royal account has been created and your Telegram is automatically connected.

*Your Account Details:*
• *Name:* ${newUser.name}
• *Email:* ${newUser.email}
• *Status:* ✅ Verified & Connected

*At Your Service, My Lord:*
• ⏰ Task reminders before start time
• 📊 Daily task summaries
• 🎯 Routine generation notices
• ⚠️ Overdue task alerts

*One more thing...*
🤖 *Give me a name, My Lord!* What would you like to call your humble servant?

Just type the name you'd like for your personal assistant.
    `;

    await bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });

    // Set state for bot name input after successful registration
    userStates.set(chatId, {
      action: 'awaiting_bot_name_after_registration',
      userId: newUser.id,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error in registration process:', error);

    // Handle specific database errors
    let errorMessage = '❌ An error occurred during registration.\nPlease try /register again.';

    if (error.code === '23505') { // Unique constraint violation
      if (error.constraint === 'users_email_key') {
        errorMessage = '❌ *Email Already Registered*\n\nThis email is already registered in LifePath.\nUse /login to connect your existing account.';
      } else if (error.constraint?.includes('user_telegram_config_user_id')) {
        errorMessage = '❌ *Account Already Connected*\n\nThis account is already connected to another Telegram.\nUse /login to connect from this Telegram.';
      }
    }

    await bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
  }
};

// Setup bot command handlers
const setupBotHandlers = () => {
  if (!bot) return;

  // /start command - Auto register/login and welcome
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramUsername = msg.from.username || null;
    const firstName = msg.from.first_name || '';
    const lastName = msg.from.last_name || '';

    console.log(`🚀 /start command received from chatId: ${chatId}, username: ${telegramUsername || 'none'}, name: ${firstName} ${lastName}`);

    try {
      // Import user service
      const userService = await import('../services/userService.js');

      // Auto register/login user
      const autoRegisterResult = await userService.default.autoRegisterTelegramUser(
        chatId,
        telegramUsername,
        firstName,
        lastName
      );

      if (!autoRegisterResult.success) {
        console.error('Auto register failed:', autoRegisterResult.error);
        await bot.sendMessage(chatId,
          '❌ *Connection Error*\n\n' +
          'Failed to connect your account. Please try again later.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = autoRegisterResult.user;
      const isNewUser = autoRegisterResult.isNewUser;

      // Check if user already has a custom bot name (not default 'Levi')
      const hasCustomBotName = user.bot_name && user.bot_name !== 'Levi';

      if (isNewUser || !hasCustomBotName) {
        // New user or user without custom bot name - ask for bot name
        const askBotNameMessage = `
🌟 *Welcome to LifePath Reminder Bot!*

Greetings, ${user.name}! 👋

${isNewUser ? 'Your LifePath account has been created automatically! 🎉' : 'Welcome back! Let\'s personalize your experience.'}

🤖 *Give me a name, My Lord!* What would you like to call your humble servant?

Just type the name you'd like for your personal assistant (2-20 characters, letters/numbers/spaces only).
        `;

        await bot.sendMessage(chatId, askBotNameMessage, { parse_mode: 'Markdown' });

        // Set state for bot name input
        userStates.set(chatId, {
          action: 'awaiting_bot_name_after_start',
          userId: user.user_id || user.id,
          timestamp: Date.now()
        });

        return; // Don't show welcome message yet
      }

      // User already has bot name - show welcome message
      const welcomeMessage = `
🌟 *Welcome back to LifePath Reminder Bot!*

Greetings, ${user.name}! 👋

Welcome back! ${user.bot_name} is ready to serve you.

*What You Can Do:*
• ➕ Add tasks with \`/addtask\`
• 📅 View today's tasks with \`/today\`
• ⏰ Get automatic task reminders
• 📊 Receive daily summaries
• 🎯 Track your progress
• 💰 Track finances with \`/income\` & \`/expense\`
• 📈 View financial summaries with \`/transaction_summary\`
• 💸 Monitor daily spending with \`/transactions_today\`

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
            { text: '📋 My Tasks', callback_data: 'cmd_mytasks' },
            { text: '📋 My Routines', callback_data: 'cmd_myroutines' }
          ],
          [
            { text: '📊 Status', callback_data: 'cmd_status' },
            { text: '📋 Menu', callback_data: 'cmd_menu' }
          ],
          [
            { text: '💰 Transactions', callback_data: 'cmd_transactions' },
            { text: '📈 Add Income', callback_data: 'cmd_income' }
          ],
          [
            { text: '📉 Add Expense', callback_data: 'cmd_expense' },
            { text: '📊 Summary', callback_data: 'cmd_transaction_summary' }
          ]
        ]
      };

      await bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error in /start command:', error);
      await bot.sendMessage(chatId,
        '❌ *Unexpected Error*\n\n' +
        'Something went wrong. Please try again later.',
        { parse_mode: 'Markdown' }
      );
    }
  });

  // /register command - Interactive registration
  // /register command - Redirect to /start (auto register)
  bot.onText(/\/register/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId,
      '📝 *Registration Not Needed!*\n\n' +
      'LifePath now uses auto registration. Just use /start and your account will be created automatically! 🎉',
      { parse_mode: 'Markdown' }
    );
  });

  // /logout command - Disconnect from LifePath


  // /menu command - Show command menu with buttons
  bot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;

    const menuMessage = `
📋 *LifePath Bot Commands*

Select a command below or type it manually:

*Connection:*
• \`/register\` - Register new LifePath account
• \`/login <email>\` - Login with email & password
• \`/logout\` - Disconnect from LifePath account
• \`/verify <code>\` - Verify with app code

*Tasks:*
• \`/addtask\` - Add new task (interactive)
• \`/quickadd\` - Quick add task
• \`/today\` - View today's tasks

*Routines:*
• \`/myroutines\` - View & manage routine templates ✨
• \`/generateroutine\` - Generate daily routine ✨
• \`/addroutine\` - Create new routine template

*Transactions:*
• \`/income <amount>\` - Quick income entry 📈
• \`/expense <amount>\` - Quick expense entry 📉
• \`/transactions\` - View all transactions 💰
• \`/transactions_today\` - View today's transactions 📅
• \`/transaction_summary\` - Financial summary 📊

*Information:*
• \`/status\` - Check connection status
• \`/help\` - Get help & documentation

*✨ Recent Updates:*
• Enhanced routine management with detailed views
• Auto-generate option after creating routines
• Improved task generation with better feedback
• Interactive routine & task creation flows

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
          { text: '📋 My Routines ✨', callback_data: 'cmd_myroutines' },
          { text: '🔄 Generate ✨', callback_data: 'generate_all_routines' }
        ],
        [
          { text: '🏗️ Create Routine', callback_data: 'cmd_addroutine' },
          { text: '📊 Check Status', callback_data: 'cmd_status' }
        ],
        [
          { text: '💰 Transactions', callback_data: 'cmd_transactions' },
          { text: '📅 Today\'s Tx', callback_data: 'cmd_transactions_today' }
        ],
        [
          { text: '🚪 Logout', callback_data: 'cmd_logout' },
          { text: '🔐 Login Guide', callback_data: 'guide_login' }
        ],
        [
          { text: '✅ Verify Guide', callback_data: 'guide_verify' },
          { text: '📚 Help & Docs', callback_data: 'cmd_help' }
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

  // /login command - Interactive login
  // /login command - Redirect to /start (auto login)
  bot.onText(/\/login/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId,
      '🔐 *Login Not Needed!*\n\n' +
      'LifePath now uses auto login. Just use /start and you will be logged in automatically! 🎉',
      { parse_mode: 'Markdown' }
    );
  });

  // Process login with email
  const processLogin = async (chatId, email) => {

    try {
      // Import user service
      const userService = await import('../services/userService.js');

      // Check if user exists
      const userResult = await userService.default.findUserByEmail(email);

      if (!userResult.success) {
        await bot.sendMessage(chatId,
          '❌ *Email Not Found*\n\n' +
          `No LifePath account found with email: ${email}\n\n` +
          'Please check your email or register at the LifePath app first.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = userResult.user;

      // Ask for password
      await bot.sendMessage(chatId,
        `🔐 *Password Required*\n\n` +
        `Please send your LifePath password for ${email}\n\n` +
        `⚠️ *Security:* Password will be deleted from chat immediately.\n\n` +
        `⏰ *Timeout:* You have 5 minutes.`,
        { parse_mode: 'Markdown' }
      );

      // Set state for password input
      userStates.set(chatId, {
        action: 'awaiting_login_password',
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        passwordHash: user.password_hash,
        timestamp: Date.now()
      });

      // Set timeout
      const timeout = setTimeout(async () => {
        try {
          await bot.sendMessage(chatId,
            '⏰ *Login Timeout*\n\n' +
            'Login session expired.\n' +
            'Use /login to try again.',
            { parse_mode: 'Markdown' }
          );
        } catch (error) {
          console.error('Error sending timeout message:', error);
        }
        userStates.delete(chatId);
      }, 5 * 60 * 1000); // 5 minutes

      userStates.get(chatId).timeoutId = timeout;

    } catch (error) {
      console.error('Error in login process:', error);
      await bot.sendMessage(chatId,
        '❌ An error occurred. Please try again.',
        { parse_mode: 'Markdown' }
      );
    }
  };

  // /verify command - Verify user with code
  bot.onText(/\/verify (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    const verificationCode = match[1].trim().toUpperCase();

    try {
      // Import user service
      const userService = await import('../services/userService.js');

      // Find user with this verification code
      const verificationResult = await userService.default.verifyUserWithCode(verificationCode);

      if (!verificationResult.success) {
        await bot.sendMessage(chatId,
          '❌ *Verification Failed*\n\n' +
          'Invalid or expired verification code.\n' +
          'Please obtain a new code from the LifePath app.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const userConfig = verificationResult.userConfig;

      // Update telegram config with verified status
      const updateResult = await userService.default.updateUserVerification(userConfig.user_id, chatId, username);

      if (!updateResult.success) {
        await bot.sendMessage(chatId,
          '❌ An error occurred during verification. Please try again.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Get user_title
      const client = await pool.connect();
      const titleResult = await client.query(`
        SELECT COALESCE(user_title, 'My Lord') as user_title
        FROM user_telegram_config
        WHERE user_id = $1
      `, [userConfig.user_id]);
      const userTitle = titleResult.rows.length > 0 ? titleResult.rows[0].user_title : 'My Lord';
      client.release();

      const successMessage = `
✅ *Verification Successful!*

Greetings, ${userTitle} ${userConfig.name}! 🎉

Your royal Telegram account is now linked to LifePath.

*At Your Service, ${userTitle}:*
• Configure your reminder preferences in the app
• I shall remind you before your tasks commence
• Receive daily summaries of your royal duties
• Get notifications when routines are generated

*Quick Tips:*
• Use /status to check your connection
• Use /help for more information
• Manage settings in the LifePath app

I am honored to serve you! 💪
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


  // /help command - Show help information
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;

    // Get user_title if connected
    let userTitle = 'My Lord';
    try {
      const client = await pool.connect();
      const titleResult = await client.query(`
        SELECT COALESCE(user_title, 'My Lord') as user_title
        FROM user_telegram_config
        WHERE telegram_chat_id = $1
      `, [chatId]);
      if (titleResult.rows.length > 0) {
        userTitle = titleResult.rows[0].user_title;
      }
      client.release();
    } catch (e) { /* ignore errors, use default */ }

    const helpMessage = `
📚 *LifePath Reminder Bot Help*

*Available Commands:*
/start - Welcome message and setup guide
/register - Register new LifePath account
/menu - Show command menu with buttons
/login <email> - Login directly from Telegram
/logout - Disconnect from LifePath account
/verify <code> - Link with code from app
/addtask - Add a new task
/today - View today's tasks
/status - Check your connection and settings
/help - Show this help message

*Getting Started:*

*Method 1: New User Registration* 📝
1. \`/register\` to create account
2. Send: \`Name | Email | Password\`
3. Instantly registered and connected!

*Method 2: Quick Login from Telegram* 🚀
1. \`/login your-email@example.com\`
2. Send your password when prompted
3. Instantly connected!

*Method 3: Verify with App Code* 📱
1. Generate code in LifePath app
2. \`/verify ABC123\` with your code
3. Connected!

*Disconnecting Account* 🚪
Use \`/logout\` to disconnect your Telegram from LifePath account anytime.

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

Stay productive, ${userTitle}! 🚀
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
      // Import user service
      const userService = await import('../services/userService.js');

      // Check if user is verified
      const userResult = await userService.default.verifyUserByChatId(chatId);

      if (!userResult.success) {
        console.log(`❌ User not verified for chatId: ${chatId}`);
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Please connect your Telegram account first using /verify or /login',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = userResult.user;
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
        SELECT utc.user_id, u.name, 
               COALESCE(utc.bot_name, 'Levi') as bot_name,
               COALESCE(utc.user_title, 'My Lord') as user_title
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
        botName: user.bot_name,
        userTitle: user.user_title,
        taskData: {}
      });

      await bot.sendMessage(chatId,
        `➕ *Quick Add Task* (Interactive Mode)\n\n` +
        `${user.bot_name} will guide you through creating a new task, ${user.user_title}.\n\n` +
        `📝 *Step 1/6:* What is the task title?\n\n` +
        `Just type the task name, no symbols needed!\n\n` +
        `*Example:* Team Meeting\n\n` +
        `Or /cancel to abort.`,
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
      // Import user service
      const userService = await import('../services/userService.js');

      // Check if user is verified
      const userResult = await userService.default.verifyUserByChatId(chatId);

      if (!userResult.success) {
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Please connect your Telegram account first using /verify or /login',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = userResult.user;

      // Define today's date for the query
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Get today's tasks using task service
      const taskService = await import('../services/taskService.js');
      const todayTasksResult = await taskService.default.getTodayTasks(user.user_id, todayStr);

      if (!todayTasksResult.success) {
        await bot.sendMessage(chatId,
          `❌ Error fetching tasks: ${todayTasksResult.error}`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const tasks = todayTasksResult.tasks;

      if (tasks.length === 0) {
        await bot.sendMessage(chatId,
          `📅 *Today's Tasks*\n\n` +
          `${user.user_title}, ${user.bot_name} confirms you have no scheduled tasks for today!\n\n` +
          `🎉 No tasks for today!\n\n` +
          `Use /addtask to create a new task.`,
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

${user.bot_name} presents your daily task overview, ${user.user_title}:

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

      message += '\n\n💪 Your Majesty is conquering the day splendidly!';

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
      // Import user service
      const userService = await import('../services/userService.js');

      const userResult = await userService.default.verifyUserByChatId(chatId);

      if (!userResult.success) {
        await bot.sendMessage(chatId, '❌ Please connect first using /login or /verify', { parse_mode: 'Markdown' });
        return;
      }

      const user = userResult.user;

      // Get tasks using task service
      const taskService = await import('../services/taskService.js');
      const tasksResult = await taskService.default.getUserTasks(user.user_id, {
        sort: [{ field: 'created_at', order: 'desc' }],
        limit: 20
      });

      if (!tasksResult.success) {
        await bot.sendMessage(chatId, '❌ Error fetching tasks. Please try again.');
        return;
      }

      const tasks = tasksResult.tasks;

      // Build a compact list with edit/delete buttons
      for (const task of tasks) {
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
        SELECT utc.user_id, u.name, 
               COALESCE(utc.bot_name, 'Levi') as bot_name,
               COALESCE(utc.user_title, 'My Lord') as user_title
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
      const taskService = await import('./taskService.js');
      const tasksResult = await taskService.default.getUserTasks(user.user_id, {
        status: { $ne: 'done' },
        sort: [
          { field: 'priority', order: 'asc', customOrder: ['high', 'medium', 'low'] },
          { field: 'time_start', order: 'asc' },
          { field: 'created_at', order: 'desc' }
        ],
        limit: 15
      });

      if (!tasksResult.success) {
        await bot.sendMessage(chatId, '❌ Error fetching tasks. Please try again.');
        return;
      }

      const tasks = tasksResult.tasks;

      if (tasks.length === 0) {
        await bot.sendMessage(chatId,
          `📋 *My Tasks*\n\n` +
          `${user.user_title}, ${user.bot_name} reports that your task list is currently empty!\n\n` +
          `✨ No active tasks!\n\n` +
          `Tap button below to add your first task.`,
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
        `${user.user_title}, ${user.bot_name} presents your current task roster:\n\n` +
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
      const taskService = await import('./taskService.js');
      const countsResult = await taskService.default.getTaskCounts(user.user_id);

      if (!countsResult.success) {
        await bot.sendMessage(chatId, '❌ Error fetching task counts. Please try again.');
        return;
      }

      const counts = countsResult.counts;

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
      const taskService = await import('./taskService.js');
      const client = await pool.connect();

      // Check if user is verified
      const result = await client.query(`
        SELECT utc.user_id, u.name, 
               COALESCE(utc.bot_name, 'Levi') as bot_name,
               COALESCE(utc.user_title, 'My Lord') as user_title
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
        const tasksResult = await taskService.default.getUserTasks(user.user_id, {
          status: { $ne: 'done' },
          sort: [
            { field: 'priority', order: 'asc', customOrder: ['high', 'medium', 'low'] },
            { field: 'time_start', order: 'asc' }
          ],
          limit: 10
        });

        if (!tasksResult.success) {
          await bot.sendMessage(chatId, '❌ Error fetching tasks. Please try again.');
          return;
        }

        const tasks = tasksResult.tasks;

        if (tasks.length === 0) {
          await bot.sendMessage(chatId,
            '✅ *All Done!*\n\nYou have no pending tasks.',
            { parse_mode: 'Markdown' }
          );
          return;
        }

        let message = '✅ *Mark as Complete*\n\nSelect a task:\n\n';

        const buttons = tasks.map(task => {
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
      const completeResult = await taskService.default.completeTask(taskId, user.user_id);

      if (!completeResult.success) {
        await bot.sendMessage(chatId, '❌ Task not found');
        return;
      }

      const task = completeResult.task;
      await bot.sendMessage(chatId,
        `✅ *Task Completed!*\n\n` +
        `${user.bot_name} celebrates your accomplishment, ${user.user_title}!\n\n` +
        `~~${task.title}~~\n\n` +
        `Magnificent work! Your productivity reigns supreme! 🎉`,
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
        SELECT utc.user_id, u.name, 
               COALESCE(utc.bot_name, 'Levi') as bot_name,
               COALESCE(utc.user_title, 'My Lord') as user_title
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
        const tasksResult = await taskService.default.getUserTasks(user.user_id, {
          status: { $ne: 'done' },
          sort: [
            { field: 'priority', order: 'asc', customOrder: ['high', 'medium', 'low'] },
            { field: 'created_at', order: 'desc' }
          ],
          limit: 10
        });

        if (!tasksResult.success) {
          await bot.sendMessage(chatId, '❌ Error fetching tasks. Please try again.');
          return;
        }

        const tasks = tasksResult.tasks;

        if (tasks.length === 0) {
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

        tasks.forEach((task, idx) => {
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
      const taskService = await import('./taskService.js');
      const taskResult = await taskService.getTaskById(taskId, user.user_id);

      if (!taskResult.success) {
        await bot.sendMessage(chatId,
          '❌ *Task Not Found*\n\n' +
          `${user.bot_name} searched diligently, ${user.user_title}, but this task doesn\'t exist or doesn\'t belong to you.\n\n` +
          'Use /edittask to see your tasks.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const task = taskResult.task;

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
        SELECT utc.user_id, u.name, 
               COALESCE(utc.bot_name, 'Levi') as bot_name,
               COALESCE(utc.user_title, 'My Lord') as user_title
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
        const tasksResult = await taskService.default.getUserTasks(user.user_id, {
          sort: [{ field: 'created_at', order: 'desc' }],
          limit: 10
        });

        if (!tasksResult.success) {
          await bot.sendMessage(chatId, '❌ Error fetching tasks. Please try again.');
          return;
        }

        const tasks = tasksResult.tasks;

        if (tasks.length === 0) {
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

        tasks.forEach((task, idx) => {
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
      const taskService = await import('./taskService.js');
      const taskResult = await taskService.default.getTaskById(taskId, user.user_id);

      if (!taskResult.success) {
        client.release();
        await bot.sendMessage(chatId,
          '❌ *Task Not Found*\n\n' +
          `${user.bot_name} searched diligently, ${user.user_title}, but this task doesn\'t exist or doesn\'t belong to you.\n\n` +
          'Use /deletetask to see your tasks.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const task = taskResult.task;

      // Delete the task
      const deleteResult = await taskService.default.deleteTask(taskId, user.user_id);

      if (!deleteResult.success) {
        await bot.sendMessage(chatId,
          '❌ *Task Not Found*\n\n' +
          `${user.bot_name} searched diligently, ${user.user_title}, but this task doesn\'t exist or doesn\'t belong to you.\n\n` +
          'Use /deletetask to see your tasks.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      task = deleteResult.task;

      const successMessage = `
✅ *Task Deleted Successfully!*

${user.bot_name} has removed the task from your realm, ${user.user_title}:

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

  // /transactions command - View user's transactions
  bot.onText(/\/transactions\b/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`💰 /transactions command received from ${msg.from.username || msg.from.first_name} (${chatId})`);

    try {
      // Check if user is verified using UserService
      const verificationResult = await UserService.verifyUserByChatId(chatId);

      if (!verificationResult.success) {
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Please connect your Telegram account first using /verify or /login',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = verificationResult.user;

      // Get transactions
      const resultTransactions = await getTransactionsService(user.user_id, {}, 1, 10);

      // Use TelegramView to format the response
      const response = TelegramView.formatTransactions({
        success: true,
        data: {
          user: user,
          transactions: resultTransactions.transactions,
          pagination: resultTransactions.pagination
        }
      }, 1, 10);

      await bot.sendMessage(chatId, response.text, response.options);

    } catch (error) {
      console.error('Error in transactions command:', error);
      await bot.sendMessage(chatId, '❌ Error fetching transactions. Please try again.');
    }
  });

  // /transactions_today command - View today's transactions
  bot.onText(/\/transactions_today/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`📅 /transactions_today command received from ${msg.from.username || msg.from.first_name} (${chatId})`);

    try {
      // Check if user is verified using UserService
      const verificationResult = await UserService.verifyUserByChatId(chatId);

      if (!verificationResult.success) {
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Please connect your Telegram account first using /verify or /login',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = verificationResult.user;

      // Get today's date for filtering
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD

      // Get transactions for today only
      const resultTransactions = await getTransactionsService(user.user_id, {
        dateFrom: todayStr,
        dateTo: todayStr
      }, 1, 10);

      // Use TelegramView to format the response with today's context
      const response = TelegramView.formatTransactionsToday({
        success: true,
        data: {
          user: user,
          transactions: resultTransactions.transactions,
          pagination: resultTransactions.pagination
        }
      }, 1, 10);

      await bot.sendMessage(chatId, response.text, response.options);

    } catch (error) {
      console.error('Error in transactions_today command:', error);
      await bot.sendMessage(chatId, '❌ Error fetching today\'s transactions. Please try again.');
    }
  });

  // /transaction_summary command - Get financial summary
  bot.onText(/\/transaction_summary/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`📊 /transaction_summary command received from ${msg.from.username || msg.from.first_name} (${chatId})`);

    try {
      // Check if user is verified using UserService
      const verificationResult = await UserService.verifyUserByChatId(chatId);

      if (!verificationResult.success) {
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Please connect your Telegram account first using /verify or /login',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = verificationResult.user;

      // Get summary for current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const summary = await getTransactionSummaryService(user.user_id, startOfMonth, endOfMonth);

      // Use TelegramView to format the response
      const response = TelegramView.formatTransactionSummary({
        success: true,
        data: {
          user: user,
          summary: summary.summary,
          recentTransactions: [] // TODO: Add recent transactions if needed
        }
      });

      await bot.sendMessage(chatId, response.text, response.options);

    } catch (error) {
      console.error('Error in transaction_summary command:', error);
      await bot.sendMessage(chatId, '❌ Error fetching summary. Please try again.');
    }
  });

  // /income command - Quick income entry
  bot.onText(/\/income(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const inputStr = match[1]?.trim();

    console.log(`📈 /income command received from ${msg.from.username || msg.from.first_name} (${chatId})`);
    console.log(`💰 Input: "${inputStr}"`);

    try {
      // Check if user is verified using UserService
      const verificationResult = await UserService.verifyUserByChatId(chatId);

      if (!verificationResult.success) {
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Please connect your Telegram account first using /verify or /login',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = verificationResult.user;

      // Validate input
      if (!inputStr) {
        await bot.sendMessage(chatId,
          '❌ *Amount Required*\n\n' +
          'Please specify the income amount.\n\n' +
          '*Examples:*\n' +
          '`/income 50000`\n' +
          '`/income gaji 50000`\n\n' +
          'This will record Rp 50,000 as income.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Parse input: split by spaces, last part is amount, rest is description
      const parts = inputStr.split(/\s+/);
      const amountStr = parts[parts.length - 1];
      const description = parts.length > 1 ? parts.slice(0, -1).join(' ') : 'Quick income entry';

      const amount = parseInt(amountStr.replace(/[^\d]/g, ''));
      if (isNaN(amount) || amount <= 0) {
        await bot.sendMessage(chatId,
          '❌ *Invalid Amount*\n\n' +
          'Please enter a valid positive number.\n\n' +
          '*Examples:*\n' +
          '`/income 50000`\n' +
          '`/income gaji 50000`\n\n' +
          'Use only numbers for the amount.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Create income transaction using quick service
      const transaction = await createQuickIncomeService(user.user_id, amount, description);

      // Use TelegramView to format the success response
      const response = TelegramView.formatTransactionCreated(transaction, user);

      await bot.sendMessage(chatId, response.text, response.options);

    } catch (error) {
      console.error('Error in income command:', error);
      await bot.sendMessage(chatId, '❌ Error recording income. Please try again.');
    }
  });

  // /expense command - Quick expense entry
  bot.onText(/\/expense(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const inputStr = match[1]?.trim();

    console.log(`📉 /expense command received from ${msg.from.username || msg.from.first_name} (${chatId})`);
    console.log(`💰 Input: "${inputStr}"`);

    try {
      // Check if user is verified using UserService
      const verificationResult = await UserService.verifyUserByChatId(chatId);

      if (!verificationResult.success) {
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Please connect your Telegram account first using /verify or /login',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = verificationResult.user;

      // Validate input
      if (!inputStr) {
        await bot.sendMessage(chatId,
          '❌ *Amount Required*\n\n' +
          'Please specify the expense amount.\n\n' +
          '*Examples:*\n' +
          '`/expense 25000`\n' +
          '`/expense bakso 25000`\n\n' +
          'This will record Rp 25,000 as expense.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Parse input: split by spaces, last part is amount, rest is description
      const parts = inputStr.split(/\s+/);
      const amountStr = parts[parts.length - 1];
      const description = parts.length > 1 ? parts.slice(0, -1).join(' ') : 'Quick expense entry';

      const amount = parseInt(amountStr.replace(/[^\d]/g, ''));
      if (isNaN(amount) || amount <= 0) {
        await bot.sendMessage(chatId,
          '❌ *Invalid Amount*\n\n' +
          'Please enter a valid positive number.\n\n' +
          '*Examples:*\n' +
          '`/expense 25000`\n' +
          '`/expense bakso 25000`\n\n' +
          'Use only numbers for the amount.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Create expense transaction using quick service
      const transaction = await createQuickExpenseService(user.user_id, amount, description);

      // Use TelegramView to format the success response
      const response = TelegramView.formatTransactionCreated(transaction, user);

      await bot.sendMessage(chatId, response.text, response.options);

    } catch (error) {
      console.error('Error in expense command:', error);
      await bot.sendMessage(chatId, '❌ Error recording expense. Please try again.');
    }
  });

  // /myroutines command - View user's routine templates
  bot.onText(/\/myroutines/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`📋 /myroutines command received from ${msg.from.username || msg.from.first_name} (${chatId})`);

    try {
      // Import controller and view
      const TelegramController = await import('../controllers/telegramController.js');
      const TelegramView = await import('../views/telegramView.js');

      // Handle business logic
      const result = await TelegramController.default.handleMyRoutines(chatId);

      // Format and send response
      const formatted = TelegramView.default.formatMyRoutines(result);
      await bot.sendMessage(chatId, formatted.text, formatted.options);

    } catch (error) {
      console.error('Error in myroutines command:', error);
      await bot.sendMessage(chatId, '❌ Error fetching routines. Please try again.');
    }
  });

  // /generateroutine command - Generate tasks from routine template
  bot.onText(/\/generateroutine(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1]?.trim();

    console.log(`🔄 /generateroutine command received from ${msg.from.username || msg.from.first_name} (${chatId})`);
    console.log(`📋 Input: "${input}"`);

    try {
      const client = await pool.connect();

      // Check if user is verified
      const result = await client.query(`
        SELECT utc.user_id, u.name, 
               COALESCE(utc.bot_name, 'Levi') as bot_name,
               COALESCE(utc.user_title, 'My Lord') as user_title
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

      // If no input provided, show available routines with better formatting
      if (!input) {
        const routinesResult = await client.query(`
          SELECT rt.id, rt.name, rt.description, rt.is_active, rt.created_at,
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

        if (routinesResult.rows.length === 0) {
          await bot.sendMessage(chatId,
            `🔄 *${user.bot_name} Awaits Your Command*\n\n` +
            `${user.bot_name} reports that you have no routine templates to generate from, ${user.user_title}.\n\n` +
            'Create a routine template first to begin your conquests!',
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[
                  { text: '➕ Create New Routine', callback_data: 'cmd_addroutine' },
                  { text: '📋 View My Routines', callback_data: 'cmd_myroutines' }
                ]]
              }
            }
          );
          return;
        }

        const activeRoutines = routinesResult.rows.filter(r => r.is_active);
        const inactiveRoutines = routinesResult.rows.filter(r => !r.is_active);

        let message = `
🔄 *${user.bot_name} Offers Generation Powers*

${user.bot_name} presents your routine options for generation, ${user.user_title}:

*How to command:*
• Click routine name to generate tasks
• Or use: \`/generateroutine <name>\`
`;

        if (activeRoutines.length > 0) {
          message += '\n\n✅ *ACTIVE ROUTINES READY FOR DEPLOYMENT:*\n';
          activeRoutines.forEach((routine, idx) => {
            const statusEmoji = routine.has_tasks ? '📝' : '⚠️';
            message += `\n${idx + 1}. ${statusEmoji} *${routine.name}*`;
            if (routine.description) {
              message += `\n   📄 ${routine.description}`;
            }
            message += `\n   📋 ${routine.tasks_count} task${routine.tasks_count !== 1 ? 's' : ''}`;
            message += `\n   📅 Created: ${new Date(routine.created_at).toLocaleDateString()}\n`;
          });
        }

        if (inactiveRoutines.length > 0) {
          message += '\n\n⏸️ *INACTIVE ROUTINES STANDBY:*\n';
          inactiveRoutines.forEach((routine, idx) => {
            const statusEmoji = routine.has_tasks ? '📝' : '⚠️';
            message += `\n${idx + 1}. ${statusEmoji} ~~${routine.name}~~ *(Inactive)*`;
            message += `\n   📋 ${routine.tasks_count} task${routine.tasks_count !== 1 ? 's' : ''}\n`;
          });
        }

        message += '\n💡 *Tip:* Only active routines can generate tasks.';

        // Create dynamic keyboard with routine options
        const keyboard = {
          inline_keyboard: []
        };

        // Add buttons for active routines
        if (activeRoutines.length > 0) {
          activeRoutines.forEach((routine) => {
            keyboard.inline_keyboard.push([
              { text: `🚀 ${routine.name}`, callback_data: `generate_routine_now_${routine.id}` },
              { text: '📝 Manage', callback_data: `routine_manage_${routine.id}` }
            ]);
          });
        }

        // Add general action buttons
        keyboard.inline_keyboard.push([
          { text: '🚀 Generate All Active', callback_data: 'generate_all_routines' },
          { text: '➕ Create New Routine', callback_data: 'cmd_addroutine' }
        ]);
        keyboard.inline_keyboard.push([
          { text: '📋 My Routines', callback_data: 'cmd_myroutines' },
          { text: '📅 Today\'s Tasks', callback_data: 'cmd_today' }
        ]);

        await bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        return;
      }

      // Generate tasks from specific routine
      const routineService = await import('./routineService.js');

      // Find routine by name or ID
      let routineId;
      const routinesResult = await client.query(`
        SELECT rt.id, rt.name
        FROM routine_templates rt
        WHERE rt.user_id = $1 AND rt.is_active = true
        ORDER BY rt.created_at DESC
      `, [user.user_id]);

      // First try to match by ID
      let foundRoutine = routinesResult.rows.find(r => r.id === input);
      if (foundRoutine) {
        routineId = foundRoutine.id;
      } else {
        // Try to match by name (case insensitive)
        foundRoutine = routinesResult.rows.find(r => r.name.toLowerCase() === input.toLowerCase());
        if (foundRoutine) {
          routineId = foundRoutine.id;
        } else {
          client.release();
          await bot.sendMessage(chatId,
            `❌ *Routine Not Found*\n\n'${input}' doesn't match any of your active routines.\n\nUse /generateroutine without parameters to see available routines.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }
      }

      console.log(`🔄 Generating routine ${routineId} for user ${user.user_id}`);
      const generationResult = await routineService.default.generateDailyTasksFromTemplate(user.user_id, routineId);

      client.release();

      if (!generationResult.success) {
        await bot.sendMessage(chatId,
          `⚠️ *Generation Skipped*\n\n${generationResult.message}`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const routine = generationResult.routineTemplate;
      const tasksGenerated = generationResult.tasksGenerated || 0;

      let successMessage = `
✅ *Routine Generated Successfully!*

📋 *${routine.name}*
${routine.description ? `📄 ${routine.description}\n` : ''}
📅 *Generated for:* ${new Date(generationResult.generationDate).toLocaleDateString()}
✅ *Tasks Created:* ${tasksGenerated}
`;

      if (tasksGenerated > 0) {
        successMessage += `\n🎉 Your daily routine is ready!`;
        successMessage += `\n\n💡 *Next Steps:*`;
        successMessage += `\n• Use /today to see all your tasks`;
        successMessage += `\n• Tasks will appear in your daily schedule`;
      } else {
        successMessage += `\n⚠️ No new tasks were created.`;
        successMessage += `\n\n*Possible reasons:*`;
        successMessage += `\n• Routine already generated today`;
        successMessage += `\n• No active tasks in this routine`;
        successMessage += `\n• All tasks already exist`;
      }

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📅 View Today\'s Tasks', callback_data: 'cmd_today' },
            { text: '📋 My Routines', callback_data: 'cmd_myroutines' }
          ]
        ]
      };

      if (tasksGenerated > 0) {
        keyboard.inline_keyboard.unshift([
          { text: '🚀 Generate Another', callback_data: 'generate_all_routines' }
        ]);
      }

      await bot.sendMessage(chatId, successMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
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
      const userService = await import('./userService.js');
      const userResult = await userService.default.verifyUserByChatId(chatId);

      if (!userResult.success) {
        client.release();
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Please connect your Telegram account first using /verify or /login',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = userResult.user;

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

      const userService = await import('./userService.js');
      const userResult = await userService.default.verifyUserByChatId(chatId);

      if (!userResult.success) {
        client.release();
        await bot.sendMessage(chatId,
          '❌ Please connect first using /login or /verify',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = userResult.user;

      // Set state for interactive routine creation
      userStates.set(chatId, {
        action: 'awaiting_interactive_routine',
        step: 'name',
        userId: user.user_id,
        userName: user.name,
        botName: user.bot_name,
        userTitle: user.user_title,
        routineData: {},
        tasks: []
      });

      await bot.sendMessage(chatId,
        `📋 *${user.bot_name} Guides Your Routine Creation*\n\n` +
        `${user.bot_name} will forge a new routine template for you, ${user.user_title}.\n\n` +
        `📝 *Step 1/2:* What shall be the name of your routine?\n\n` +
        `Simply type the routine name, no symbols required!\n\n` +
        `*Example:* Morning Routine\n\n` +
        `Or /cancel to abort the creation.`,
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
      const userService = await import('./userService.js');
      const userResult = await userService.default.verifyUserByChatId(chatId);

      if (!userResult.success) {
        client.release();
        await bot.sendMessage(chatId,
          '❌ *Not Connected*\n\n' +
          'Please connect your Telegram account first using /verify or /login',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = userResult.user;

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

      const userService = await import('./userService.js');
      const userResult = await userService.default.verifyUserByChatId(chatId);

      if (!userResult.success) {
        client.release();
        await bot.sendMessage(chatId,
          '❌ Please connect first using /login or /verify',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const user = userResult.user;

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
      } else if (data === 'cmd_addroutine') {
        // Execute /addroutine command directly
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
            text: '/addroutine'
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
      } else if (data === 'cmd_register') {
        // Execute /register command directly
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
            text: '/register'
          }
        });
      } else if (data === 'cmd_logout') {
        // Execute /logout command directly
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
            text: '/logout'
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
      } else if (data.startsWith('confirm_delete_routine_')) {
        // Confirm delete routine
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
      } else if (data.startsWith('confirm_delete_')) {
        // Confirm delete task
        const taskId = data.replace('confirm_delete_', '');
        await handleTaskDeleteExecute(chatId, messageId, taskId);
      } else if (data.startsWith('cancel_delete_routine_')) {
        await bot.editMessageText('❌ Routine deletion cancelled.', { chat_id: chatId, message_id: messageId });
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
        // Get user_title
        const client = await pool.connect();
        const userConfigResult = await client.query(`
          SELECT COALESCE(user_title, 'My Lord') as user_title
          FROM user_telegram_config
          WHERE telegram_chat_id = $1
        `, [chatId]);
        const userTitle = userConfigResult.rows.length > 0 ? userConfigResult.rows[0].user_title : 'My Lord';
        client.release();

        userStates.delete(chatId);
        await bot.editMessageText(
          `✅ *Routine Created Successfully, ${userTitle}!*\n\n` +
          'You may view your routines with /myroutines',
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
      } else if (data.startsWith('generate_routine_now_')) {
        // Generate routine immediately after creation
        const routineId = data.replace('generate_routine_now_', '');
        await handleGenerateRoutineNow(chatId, messageId, routineId);
      } else if (data.startsWith('routine_manage_')) {
        // Show routine management options
        const routineId = data.replace('routine_manage_', '');
        await handleRoutineManagement(chatId, messageId, routineId);
      } else if (data.startsWith('activate_routine_')) {
        // Activate inactive routine
        const routineId = data.replace('activate_routine_', '');
        await handleActivateRoutine(chatId, messageId, routineId);
      } else if (data.startsWith('deactivate_routine_')) {
        // Deactivate active routine
        const routineId = data.replace('deactivate_routine_', '');
        await handleDeactivateRoutine(chatId, messageId, routineId);
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
      } else if (data === 'confirm_logout') {
        // Confirm logout - disconnect user
        const userState = userStates.get(chatId);
        if (!userState || userState.action !== 'awaiting_logout_confirmation') {
          await bot.answerCallbackQuery(callbackQuery.id, {
            text: '❌ Logout session expired',
            show_alert: true
          });
          return;
        }

        // Clear timeout
        if (userState.timeoutId) {
          clearTimeout(userState.timeoutId);
        }

        try {
          const client = await pool.connect();

          // Disconnect user from Telegram
          await client.query(`
            UPDATE user_telegram_config
            SET telegram_chat_id = NULL,
                telegram_username = NULL,
                is_verified = false,
                is_active = false,
                verification_code = NULL,
                verification_expires_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1
          `, [userState.userId]);

          client.release();

          // Update confirmation message
          await bot.editMessageText(
            `✅ *Successfully Logged Out!*\n\n` +
            `**${userState.userName}** has been disconnected from this Telegram account.\n\n` +
            `🔄 *What happens now:*\n` +
            `• No more task reminders\n` +
            `• No more daily summaries\n` +
            `• No more routine notifications\n\n` +
            `💡 *Want to reconnect?*\n` +
            `Use /login or /register anytime!`,
            {
              chat_id: chatId,
              message_id: userState.messageId,
              parse_mode: 'Markdown'
            }
          );

          // Clear user state
          userStates.delete(chatId);

          console.log(`🚪 User ${userState.userEmail} logged out from chat ${chatId}`);

        } catch (error) {
          console.error('Error during logout:', error);
          await bot.editMessageText(
            '❌ *Logout Failed*\n\n' +
            'An error occurred while logging out. Please try again.',
            {
              chat_id: chatId,
              message_id: userState.messageId,
              parse_mode: 'Markdown'
            }
          );
        }
      } else if (data === 'cancel_logout') {
        // Cancel logout
        const userState = userStates.get(chatId);
        if (userState && userState.action === 'awaiting_logout_confirmation') {
          // Clear timeout
          if (userState.timeoutId) {
            clearTimeout(userState.timeoutId);
          }

          await bot.editMessageText(
            `❌ *Logout Cancelled*\n\n` +
            `You are still connected as **${userState.userName}**.\n\n` +
            `Use /logout anytime if you want to disconnect.`,
            {
              chat_id: chatId,
              message_id: userState.messageId,
              parse_mode: 'Markdown'
            }
          );
          userStates.delete(chatId);
        }
      } else if (data === 'cmd_transactions') {
        // Trigger transactions command
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
            text: '/transactions'
          }
        });
      } else if (data === 'cmd_transactions_today') {
        // Trigger transactions_today command
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
            text: '/transactions_today'
          }
        });
      } else if (data.startsWith('transactions_page_')) {
        // Handle pagination for transactions
        const page = parseInt(data.replace('transactions_page_', ''));
        await handleTransactionsPage(chatId, messageId, page);
      } else if (data.startsWith('transactions_today_page_')) {
        // Handle pagination for today's transactions
        const page = parseInt(data.replace('transactions_today_page_', ''));
        await handleTransactionsTodayPage(chatId, messageId, page);
      } else if (data === 'cmd_transaction_summary') {
        // Trigger transaction_summary command
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
            text: '/transaction_summary'
          }
        });
      } else if (data === 'cmd_income') {
        const response = TelegramView.formatQuickTransactionHelp('income', 'income');
        await bot.sendMessage(chatId, response.text, response.options);
      } else if (data === 'cmd_expense') {
        const response = TelegramView.formatQuickTransactionHelp('expense', 'expense');
        await bot.sendMessage(chatId, response.text, response.options);
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

    // Check if user has a pending state
    const userState = userStates.get(chatId);

    // Handle state-based interactions first, then let command handlers process
    if (text && text.startsWith('/')) {
      // If user has a state, handle state-based commands
      if (userState && userState.action === 'awaiting_registration_input' && text.toLowerCase().startsWith('/register ')) {
        // Remove /register prefix and process as registration input
        msg.text = text.substring(10).trim(); // Remove "/register "
        console.log(`🔄 Converted command to input: ${msg.text}`);
      } else if (userState) {
        // User has state, but command doesn't match, skip
        console.log(`⏭️  Skipping command (user has pending state): ${text}`);
        return;
      } else {
        // No state, let command handlers process this
        return;
      }
    }

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
    } else if (userState.action === 'awaiting_transaction_input') {
      console.log(`✅ Processing transaction input for user ${chatId}`);
      await handleTransactionInput(chatId, text, userState.userId, userState.userName);
      userStates.delete(chatId);
      console.log(`🗑️  State cleared for user ${chatId}`);
    } else if (userState.action === 'awaiting_login_email') {
      console.log(`✅ Processing login email input for user ${chatId}`);
      const email = text.trim().toLowerCase();
      // Clear timeout
      if (userState.timeoutId) {
        clearTimeout(userState.timeoutId);
      }
      userStates.delete(chatId);
      await processLogin(chatId, email);
    } else if (userState.action === 'awaiting_registration_name') {
      console.log(`✅ Processing registration name input for user ${chatId}`);
      const name = text.trim();

      if (name.length < 2 || name.length > 100) {
        await bot.sendMessage(chatId,
          '❌ *Invalid Name*\n\n' +
          'Name must be 2-100 characters long.\n' +
          'Please try again.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Clear timeout
      if (userState.timeoutId) {
        clearTimeout(userState.timeoutId);
      }

      // Ask for email
      await bot.sendMessage(chatId,
        `📝 *Step 2 of 3:* What's your email address?\n\n` +
        `*Example:* john@example.com\n\n` +
        `⏰ *Timeout:* You have 5 minutes.`,
        { parse_mode: 'Markdown' }
      );

      // Set state for email input
      userStates.set(chatId, {
        action: 'awaiting_registration_email',
        name: name,
        timestamp: Date.now()
      });

      // Set timeout
      const timeout = setTimeout(async () => {
        try {
          await bot.sendMessage(chatId,
            '⏰ *Registration Timeout*\n\n' +
            'Registration session expired.\n' +
            'Use /register to start again.',
            { parse_mode: 'Markdown' }
          );
        } catch (error) {
          console.error('Error sending timeout message:', error);
        }
        userStates.delete(chatId);
      }, 5 * 60 * 1000);

      userStates.get(chatId).timeoutId = timeout;
    } else if (userState.action === 'awaiting_registration_email') {
      console.log(`✅ Processing registration email input for user ${chatId}`);
      const email = text.trim().toLowerCase();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        await bot.sendMessage(chatId,
          '❌ *Invalid Email*\n\n' +
          'Please provide a valid email address.\n' +
          'Please try again.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Check if email already exists
      try {
        const client = await pool.connect();
        const existingUser = await client.query(
          'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
          [email]
        );
        client.release();

        if (existingUser.rows.length > 0) {
          await bot.sendMessage(chatId,
            '❌ *Email Already Registered*\n\n' +
            'This email is already registered in LifePath.\n' +
            'Use /login to connect your existing account.',
            { parse_mode: 'Markdown' }
          );
          // Clear timeout
          if (userState.timeoutId) {
            clearTimeout(userState.timeoutId);
          }
          userStates.delete(chatId);
          return;
        }
      } catch (error) {
        console.error('Error checking email:', error);
        await bot.sendMessage(chatId,
          '❌ An error occurred. Please try /register again.',
          { parse_mode: 'Markdown' }
        );
        // Clear timeout
        if (userState.timeoutId) {
          clearTimeout(userState.timeoutId);
        }
        userStates.delete(chatId);
        return;
      }

      // Clear timeout
      if (userState.timeoutId) {
        clearTimeout(userState.timeoutId);
      }

      // Ask for password
      await bot.sendMessage(chatId,
        `📝 *Step 3 of 3:* Create a password\n\n` +
        `*Requirements:*\n` +
        `• At least 6 characters\n` +
        `• Will be encrypted securely\n\n` +
        `⚠️ *Security:* Password will be deleted from chat immediately.\n\n` +
        `⏰ *Timeout:* You have 5 minutes.`,
        { parse_mode: 'Markdown' }
      );

      // Set state for password input
      userStates.set(chatId, {
        action: 'awaiting_registration_password',
        name: userState.name,
        email: email,
        timestamp: Date.now()
      });

      // Set timeout
      const timeout = setTimeout(async () => {
        try {
          await bot.sendMessage(chatId,
            '⏰ *Registration Timeout*\n\n' +
            'Registration session expired.\n' +
            'Use /register to start again.',
            { parse_mode: 'Markdown' }
          );
        } catch (error) {
          console.error('Error sending timeout message:', error);
        }
        userStates.delete(chatId);
      }, 5 * 60 * 1000);

      userStates.get(chatId).timeoutId = timeout;
    } else if (userState.action === 'awaiting_registration_password') {
      console.log(`✅ Processing registration password input for user ${chatId}`);
      const password = text.trim();

      if (password.length < 6) {
        await bot.sendMessage(chatId,
          '❌ *Password Too Short*\n\n' +
          'Password must be at least 6 characters long.\n' +
          'Please try again.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Clear timeout
      if (userState.timeoutId) {
        clearTimeout(userState.timeoutId);
      }

      // Delete password message for security
      try {
        await bot.deleteMessage(chatId, msg.message_id);
      } catch (err) {
        console.log('Could not delete password message');
      }

      userStates.delete(chatId);

      // Process registration
      const input = `${userState.name} | ${userState.email} | ${password}`;
      await processRegistration(chatId, input);
    } else if (userState.action === 'awaiting_login_password') {
      console.log(`✅ Processing login password input for user ${chatId}`);
      const password = text.trim();

      // Delete password message for security
      try {
        await bot.deleteMessage(chatId, msg.message_id);
      } catch (err) {
        console.log('Could not delete password message');
      }

      // Clear timeout
      if (userState.timeoutId) {
        clearTimeout(userState.timeoutId);
      }

      userStates.delete(chatId);

      // Verify password
      try {
        const bcrypt = await import('bcryptjs');
        const isMatch = await bcrypt.default.compare(password, userState.passwordHash);

        if (!isMatch) {
          await bot.sendMessage(chatId,
            '❌ *Incorrect Password*\n\n' +
            'The password you entered is incorrect.\n' +
            'Use /login to try again.',
            { parse_mode: 'Markdown' }
          );
          return;
        }

        // Password correct - update telegram config
        const client = await pool.connect();

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
        `, [chatId, msg.from.username, userState.userId]);

        // Create default reminder settings if not exists
        await client.query(`
          INSERT INTO reminder_settings (user_id)
          VALUES ($1)
          ON CONFLICT (user_id) DO NOTHING
        `, [userState.userId]);

        // Get user_title
        const titleResult = await client.query(`
          SELECT COALESCE(user_title, 'My Lord') as user_title
          FROM user_telegram_config
          WHERE user_id = $1
        `, [userState.userId]);
        const userTitle = titleResult.rows.length > 0 ? titleResult.rows[0].user_title : 'My Lord';

        client.release();

    const successMessage = `
✅ *Login Successful!*

Welcome back, ${userTitle} ${userState.userName}! I'm ${userState.botName || 'Levi'}, your humble servant ready to assist! 🎉

Your royal Telegram is now connected to LifePath.

*At Your Service, ${userTitle}:*
• ⏰ Task reminders before start time
• 📊 Daily task summaries  
• 🎯 Routine generation notices
• ⚠️ Overdue task alerts

*Ready to Serve!*
• Use /status to check settings
• Configure preferences in LifePath app
• Start creating tasks and get reminders!

I am honored to serve Your Majesty! 💪
    `;        await bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });

      } catch (error) {
        console.error('Error in password verification:', error);
        await bot.sendMessage(chatId,
          '❌ An error occurred during login. Please try again.',
          { parse_mode: 'Markdown' }
        );
      }
    } else if (userState.action === 'awaiting_password') {
      // This is handled by the one-time handler in /login
      // Don't interfere
      console.log(`🔐 Awaiting password, skipping...`);
      return;
    } else if (userState.action === 'awaiting_bot_name_after_registration') {
      console.log(`✅ Processing bot name input after registration for user ${chatId}`);
      const botName = text.trim();

      // Validate bot name
      if (botName.length < 2 || botName.length > 20) {
        await bot.sendMessage(chatId,
          '❌ *Invalid Bot Name*\n\n' +
          'Bot name must be 2-20 characters long.\n' +
          'Please try again.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Check for valid characters (letters, numbers, spaces)
      const botNameRegex = /^[a-zA-Z0-9\s]+$/;
      if (!botNameRegex.test(botName)) {
        await bot.sendMessage(chatId,
          '❌ *Invalid Bot Name*\n\n' +
          'Bot name can only contain letters, numbers, and spaces.\n' +
          'Please try again.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Save bot name to database
      try {
        const client = await pool.connect();
        await client.query(`
          UPDATE user_telegram_config
          SET bot_name = $1, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2
        `, [botName, userState.userId]);

        // Get user_title (may already be set)
        const titleResult = await client.query(`
          SELECT COALESCE(user_title, 'My Lord') as user_title
          FROM user_telegram_config
          WHERE user_id = $1
        `, [userState.userId]);
        const userTitle = titleResult.rows.length > 0 ? titleResult.rows[0].user_title : 'My Lord';
        client.release();

        userStates.delete(chatId);

        await bot.sendMessage(chatId,
          `🎉 *Perfect, ${userTitle}!*\n\n` +
          `From now on, you may call me *${botName}*! 🤖\n\n` +
          `I am your humble personal assistant, ready to serve you with tasks and routines.\n\n` +
          `*At Your Command, ${userTitle}:*\n` +
          `• Use /addtask to create your first task\n` +
          `• Use /status to check your settings\n` +
          `• Configure preferences in the LifePath app\n\n` +
          `I am honored to serve you! 💪`,
          { parse_mode: 'Markdown' }
        );

      } catch (error) {
        console.error('Error saving bot name:', error);
        await bot.sendMessage(chatId,
          '❌ An error occurred while saving your bot name. You may change it later using /settings.',
          { parse_mode: 'Markdown' }
        );
        userStates.delete(chatId);
      }
    } else if (userState.action === 'awaiting_bot_name_after_start') {
      console.log(`✅ Processing bot name input after /start for user ${chatId}`);
      const botName = text.trim();

      // Validate bot name
      if (botName.length < 2 || botName.length > 20) {
        await bot.sendMessage(chatId,
          '❌ *Invalid Bot Name*\n\n' +
          'Bot name must be 2-20 characters long.\n' +
          'Please try again.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Check for valid characters (letters, numbers, spaces)
      const botNameRegex = /^[a-zA-Z0-9\s]+$/;
      if (!botNameRegex.test(botName)) {
        await bot.sendMessage(chatId,
          '❌ *Invalid Bot Name*\n\n' +
          'Bot name can only contain letters, numbers, and spaces.\n' +
          'Please try again.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Save bot name to database
      try {
        const client = await pool.connect();
        await client.query(`
          UPDATE user_telegram_config
          SET bot_name = $1, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2
        `, [botName, userState.userId]);
        client.release();

        // Ask for user title preference
        const askTitleMessage = `
🎉 *Perfect!*

From now on, I shall be known as *${botName}*! 🤖

*One more thing...* 👑

How would you like me to address you?

Choose from the options below or type your own custom title:
        `;

        const titleKeyboard = {
          inline_keyboard: [
            [
              { text: '👑 Yang Mulia', callback_data: 'title_Yang Mulia' },
              { text: '💼 Bos', callback_data: 'title_Bos' }
            ],
            [
              { text: '🎩 Tuan', callback_data: 'title_Tuan' },
              { text: '👨‍💼 Boss', callback_data: 'title_Boss' }
            ],
            [
              { text: '🤴 Raja', callback_data: 'title_Raja' },
              { text: '⚡ Master', callback_data: 'title_Master' }
            ],
            [
              { text: '✍️ Custom (Type Your Own)', callback_data: 'title_custom' }
            ]
          ]
        };

        await bot.sendMessage(chatId, askTitleMessage, {
          parse_mode: 'Markdown',
          reply_markup: titleKeyboard
        });

        // Update state to awaiting title selection
        userStates.set(chatId, {
          action: 'awaiting_user_title',
          userId: userState.userId,
          botName: botName,
          timestamp: Date.now()
        });

        return; // Don't show welcome message yet

        const keyboard = {
          inline_keyboard: [
            [
              { text: '➕ Add Task', callback_data: 'cmd_addtask' },
              { text: '📅 Today\'s Tasks', callback_data: 'cmd_today' }
            ],
            [
              { text: '📋 My Tasks', callback_data: 'cmd_mytasks' },
              { text: '📋 My Routines', callback_data: 'cmd_myroutines' }
            ],
            [
              { text: '📊 Status', callback_data: 'cmd_status' },
              { text: '📋 Menu', callback_data: 'cmd_menu' }
            ],
            [
              { text: '💰 Transactions', callback_data: 'cmd_transactions' },
              { text: '📈 Add Income', callback_data: 'cmd_income' }
            ],
            [
              { text: '📉 Add Expense', callback_data: 'cmd_expense' },
              { text: '📊 Summary', callback_data: 'cmd_transaction_summary' }
            ]
          ]
        };

        await bot.sendMessage(chatId, welcomeMessage, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });

      } catch (error) {
        console.error('Error saving bot name:', error);
        await bot.sendMessage(chatId,
          '❌ An error occurred while saving your bot name. You may change it later using /settings.',
          { parse_mode: 'Markdown' }
        );
        userStates.delete(chatId);
      }
    } else if (userState.action === 'awaiting_user_title') {
      // Handle custom title input
      console.log(`✅ Processing custom user title for ${chatId}`);
      const customTitle = text.trim();

      // Validate custom title
      if (customTitle.length < 2 || customTitle.length > 30) {
        await bot.sendMessage(chatId,
          '❌ *Invalid Title*\n\n' +
          'Title must be 2-30 characters long.\n' +
          'Please try again.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Save user title to database
      try {
        const client = await pool.connect();
        await client.query(`
          UPDATE user_telegram_config
          SET user_title = $1, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2
        `, [customTitle, userState.userId]);
        client.release();

        userStates.delete(chatId);

        // Show final welcome message
        await showWelcomeMessage(chatId, userState.botName, customTitle);

      } catch (error) {
        console.error('Error saving user title:', error);
        await bot.sendMessage(chatId,
          '❌ An error occurred while saving your title preference.',
          { parse_mode: 'Markdown' }
        );
        userStates.delete(chatId);
      }
    }
  });

  // Handle callback queries for user title selection
  bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const data = callbackQuery.data;

    // Handle title selection
    if (data.startsWith('title_')) {
      const userState = userStates.get(chatId);
      
      if (!userState || userState.action !== 'awaiting_user_title') {
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: 'Session expired. Please use /start again.'
        });
        return;
      }

      if (data === 'title_custom') {
        // User wants to type custom title
        await bot.editMessageText(
          '✍️ *Custom Title*\n\n' +
          'Please type your custom title (2-30 characters).\n\n' +
          'Example: Kapten, Komandan, etc.',
          {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown'
          }
        );
        await bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      // Extract title from callback data
      const selectedTitle = data.replace('title_', '');

      // Save to database
      try {
        const client = await pool.connect();
        await client.query(`
          UPDATE user_telegram_config
          SET user_title = $1, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2
        `, [selectedTitle, userState.userId]);
        client.release();

        userStates.delete(chatId);

        await bot.answerCallbackQuery(callbackQuery.id, {
          text: `✅ Great! You will be addressed as "${selectedTitle}"`
        });

        // Delete the title selection message
        await bot.deleteMessage(chatId, msg.message_id);

        // Show final welcome message
        await showWelcomeMessage(chatId, userState.botName, selectedTitle);

      } catch (error) {
        console.error('Error saving user title:', error);
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: '❌ Error saving title. Please try again.'
        });
      }
      return;
    }

    // ... existing callback query handlers ...
  });

  // Helper function to show welcome message with user's preferences
  const showWelcomeMessage = async (chatId, botName, userTitle) => {
    const welcomeMessage = `
🎉 *Setup Complete, ${userTitle}!*

From now on, you may call me *${botName}*! 🤖

I am your humble personal assistant, ready to serve ${userTitle} with tasks and routines.

*What You Can Do:*
• ➕ Add tasks with \`/addtask\`
• 📅 View today's tasks with \`/today\`
• ⏰ Get automatic task reminders
• 📊 Receive daily summaries
• 🎯 Track your progress
• 💰 Track finances with \`/income\` & \`/expense\`
• 📈 View financial summaries with \`/transaction_summary\`
• 💸 Monitor daily spending with \`/transactions_today\`

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
          { text: '📋 My Tasks', callback_data: 'cmd_mytasks' },
          { text: '📋 My Routines', callback_data: 'cmd_myroutines' }
        ],
        [
          { text: '💰 Transactions', callback_data: 'cmd_transactions' },
          { text: '📈 Add Income', callback_data: 'cmd_income' }
        ],
        [
          { text: '📉 Add Expense', callback_data: 'cmd_expense' },
          { text: '📊 Summary', callback_data: 'cmd_transaction_summary' }
        ]
      ]
    };

    await bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  };

  console.log('✅ Telegram Bot command handlers registered');
};

// Helper function for marking task as complete
const handleTaskComplete = async (chatId, taskId) => {
  try {
    const client = await pool.connect();

    // Get user info
    const userResult = await client.query(`
      SELECT utc.user_id, u.name, 
             COALESCE(utc.bot_name, 'Levi') as bot_name,
             COALESCE(utc.user_title, 'My Lord') as user_title
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
    client.release();

    // Use task service to complete task
    const taskService = await import('../services/taskService.js');
    const result = await taskService.default.completeTask(taskId, user.user_id);

    if (!result.success) {
      await bot.sendMessage(chatId, `❌ Error completing task: ${result.error}`);
      return;
    }

    const task = result.task;

    await bot.sendMessage(chatId,
      `✅ *Task Completed!*\n\n` +
      `${user.bot_name} celebrates your accomplishment, ${user.user_title}!\n\n` +
      `~~${task.title}~~\n\n` +
      `Magnificent work! Your productivity reigns supreme! 🎉`,
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
      SELECT utc.user_id, u.name, 
             COALESCE(utc.bot_name, 'Levi') as bot_name,
             COALESCE(utc.user_title, 'My Lord') as user_title
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

    // Get task using task service
    const taskService = await import('../services/taskService.js');
    const taskResult = await taskService.default.getTaskById(taskId, user.user_id);

    if (!taskResult.success) {
      client.release();
      await bot.sendMessage(chatId, '❌ Task not found');
      return;
    }

    const task = taskResult.task;

    // Show current task and edit options
    const message = `
✏️ *Edit Task*

${user.bot_name} stands ready to assist with your task modifications, ${user.user_title}:

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
    client.release();

    // Import task service and get task
    const taskService = await import('../services/taskService.js');
    const result = await taskService.default.getTaskById(taskId, user.user_id);

    if (!result.success) {
      await bot.sendMessage(chatId, '❌ Task not found');
      return;
    }

    const task = result.task;

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
    client.release();

    // Import task service and get task
    const taskService = await import('../services/taskService.js');
    const result = await taskService.default.getTaskById(taskId, user.user_id);

    if (!result.success) {
      await bot.sendMessage(chatId, '❌ Task not found');
      return;
    }

    const task = result.task;

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
    client.release();

    // Import task service and delete task
    const taskService = await import('../services/taskService.js');
    const result = await taskService.default.deleteTask(taskId, user.user_id);

    if (!result.success) {
      await bot.editMessageText(`❌ Error deleting task: ${result.error}`, {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }

    const task = result.task;

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
          `✅ Title saved!\n\n` +
          `${userState.botName} continues guiding you, ${userState.userTitle || 'My Lord'}.\n\n` +
          `📝 *Step 2/6:* Add a description (optional)\n\n` +
          `Type a brief description, or send "-" to skip.\n\n` +
          `*Example:* Discuss Q4 goals and project updates`,
          { parse_mode: 'Markdown' }
        );
        break;

      case 'description':
        // Save description and ask for priority
        taskData.description = text.trim() === '-' ? '' : text.trim();
        userState.step = 'priority';
        userStates.set(chatId, userState);

        await bot.sendMessage(chatId,
          `✅ Description saved!\n\n` +
          `${userState.botName} needs to know the priority level, ${userState.userTitle || 'My Lord'}.\n\n` +
          `📊 *Step 3/6:* Select priority\n\n` +
          `Choose task priority:`,
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
          `✅ Category saved!\n\n` +
          `${userState.botName} needs to know when you'll start this task, ${userState.userTitle || 'My Lord'}.\n\n` +
          `⏰ *Step 5/6:* What time will you start?\n\n` +
          `Enter start time in HH:MM format (24-hour)\n\n` +
          `*Example:* 09:00 or 14:30\n\n` +
          `⚠️ *Required for reminders!*`,
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
          `✅ Start time saved!\n\n` +
          `${userState.botName} is almost done setting up your task, ${userState.userTitle || 'My Lord'}.\n\n` +
          `⏰ *Step 6/6:* When will it end? (optional)\n\n` +
          `Enter end time in HH:MM format, or send "-" to skip.\n\n` +
          `*Example:* 10:00`,
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
      const client = await pool.connect();
      const res = await client.query('SELECT name FROM routine_templates WHERE id = $1 AND user_id = $2', [routineId, userId]);
      client.release();

      const routineName = res.rows.length ? res.rows[0].name : 'Routine';

      // Delegate creation to the routine task creator
      await createRoutineTaskFromInteractive(chatId, taskData, routineId, routineName, userId);
      routineAttachMap.delete(chatId);
      return;
    }

    // Import task service and create task
    const taskService = await import('../services/taskService.js');
    const result = await taskService.default.createTask(userId, taskData);

    if (!result.success) {
      await bot.sendMessage(chatId, `❌ Error creating task: ${result.error}`);
      return;
    }

    const task = result.task;

    // Get bot name and user_title for personalized messages
    const client = await pool.connect();
    const userConfigResult = await client.query(`
      SELECT COALESCE(bot_name, 'Levi') as bot_name,
             COALESCE(user_title, 'My Lord') as user_title
      FROM user_telegram_config
      WHERE telegram_chat_id = $1
    `, [chatId]);
    const botName = userConfigResult.rows[0]?.bot_name || 'Levi';
    const userTitle = userConfigResult.rows[0]?.user_title || 'My Lord';
    client.release();

    const emoji = taskData.priority === 'high' ? '🔴' : taskData.priority === 'medium' ? '🟡' : '🟢';
    const categoryEmoji = taskData.category === 'work' ? '💼' : taskData.category === 'learn' ? '📚' : '🧘';

    const successMessage = `
✅ *Task Created Successfully!*

${botName} has crafted your new task perfectly, ${userTitle}:

${categoryEmoji} *${task.title}*
${task.description ? `_${task.description}_\n` : ''}
${emoji} *Priority:* ${task.priority.toUpperCase()}
📁 *Category:* ${task.category}
⏰ *Time:* ${task.time_start}${task.time_end ? ` - ${task.time_end}` : ''}
⏰ *Reminders:* Scheduled

*Task creation completed!* 🎉

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
  const { step, routineData, tasks, userId, botName } = userState;

  try {
    switch (step) {
      case 'name':
        // Save name and ask for description
        routineData.name = text.trim();
        userState.step = 'description';
        userStates.set(chatId, userState);

        await bot.sendMessage(chatId,
          `✅ Routine name saved!\n\n` +
          `${botName} continues guiding you, ${userState.userTitle || 'My Lord'}.\n\n` +
          `📝 *Step 2/2:* Add a description (optional)\n\n` +
          `Type a brief description, or send "-" to skip.\n\n` +
          `*Example:* Daily morning productivity routine`,
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
            `✅ *${botName} Has Forged Your Routine, ${userState.userTitle || 'My Lord'}!*\n\n` +
            `📋 *${routineData.name}*\n` +
            `${routineData.description ? `_${routineData.description}_\n\n` : '\n'}` +
            `${botName} awaits your command for what comes next, ${userState.userTitle || 'My Lord'}:`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '➕ Add Tasks', callback_data: `add_task_to_new_routine_${routineId}` },
                    { text: '🚀 Generate Now', callback_data: `generate_routine_now_${routineId}` }
                  ],
                  [
                    { text: '✅ Done', callback_data: 'routine_done' }
                  ]
                ]
              }
            }
          );
        } else {
          userStates.delete(chatId);
        }
        break;

      default:
        await bot.sendMessage(chatId, `❌ Unknown step. Please start again with /quickroutine`);
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
    successMessage += '\n\nWhat would you like to do next?';

    await bot.sendMessage(chatId, successMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '➕ Add Another Task', callback_data: `select_routine_for_task_${routineId}` },
            { text: '🚀 Generate Now', callback_data: `generate_routine_now_${routineId}` }
          ],
          [
            { text: '✅ Done', callback_data: 'routine_done' }
          ]
        ]
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
        const result = await routineService.default.generateDailyTasksFromTemplate(user.user_id, routine.id);

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

    // Get user_title for message
    const userConfigResult = await client.query(`
      SELECT COALESCE(user_title, 'My Lord') as user_title
      FROM user_telegram_config
      WHERE telegram_chat_id = $1
    `, [chatId]);
    const userTitle = userConfigResult.rows.length > 0 ? userConfigResult.rows[0].user_title : 'My Lord';

    await bot.sendMessage(chatId,
      `✅ *All Routines Generated, ${userTitle}!*\n\n` +
      `🗓️ Routines: ${routineNames.join(', ')}\n` +
      `📋 *${totalTasksGenerated} tasks* added to your royal list\n\n` +
      `Use /today to see your tasks!`,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Error generating all routines:', error);
    await bot.sendMessage(chatId, '❌ Error generating routines');
  }
};

// Helper function to show routine management options
const handleRoutineManagement = async (chatId, messageId, routineId) => {
  try {
    const client = await pool.connect();

    // Get user info and routine details
    const userResult = await client.query(`
      SELECT utc.user_id, u.name
      FROM user_telegram_config utc
      JOIN users u ON utc.user_id = u.id
      WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
    `, [chatId]);

    if (userResult.rows.length === 0) {
      client.release();
      await bot.editMessageText('❌ Please connect first using /login', { chat_id: chatId, message_id: messageId });
      return;
    }

    const user = userResult.rows[0];

    // Get routine details
    const routineResult = await client.query(`
      SELECT rt.*,
             COUNT(rtt.id) as tasks_count
      FROM routine_templates rt
      LEFT JOIN routine_template_tasks rtt ON rt.id = rtt.routine_template_id AND rtt.is_active = true
      WHERE rt.id = $1 AND rt.user_id = $2
      GROUP BY rt.id
    `, [routineId, user.user_id]);

    if (routineResult.rows.length === 0) {
      client.release();
      await bot.editMessageText('❌ Routine not found', { chat_id: chatId, message_id: messageId });
      return;
    }

    const routine = routineResult.rows[0];
    client.release();

    const statusEmoji = routine.is_active ? '✅' : '⏸️';

    let message = `
📝 *Routine Management*

${statusEmoji} *${routine.name}*
📄 ${routine.description || 'No description'}
📋 ${routine.tasks_count} tasks
📅 Created: ${new Date(routine.created_at).toLocaleDateString()}
📅 Updated: ${new Date(routine.updated_at).toLocaleDateString()}
`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📝 Edit Routine', callback_data: `routine_edit_${routineId}` },
          { text: '➕ Add Tasks', callback_data: `select_routine_for_task_${routineId}` }
        ],
        [
          { text: '🚀 Generate Now', callback_data: `generate_routine_now_${routineId}` },
          { text: routine.is_active ? '⏸️ Deactivate' : '▶️ Activate', callback_data: routine.is_active ? `deactivate_routine_${routineId}` : `activate_routine_${routineId}` }
        ],
        [
          { text: '🗑️ Delete', callback_data: `routine_delete_${routineId}` },
          { text: '⬅️ Back to List', callback_data: 'cmd_myroutines' }
        ]
      ]
    };

    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

  } catch (error) {
    console.error('Error showing routine management:', error);
    await bot.editMessageText('❌ Error loading routine details', { chat_id: chatId, message_id: messageId });
  }
};

// Helper function to activate/deactivate routine
const handleActivateRoutine = async (chatId, messageId, routineId) => {
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
      await bot.editMessageText('❌ Please connect first using /login', { chat_id: chatId, message_id: messageId });
      return;
    }

    const user = userResult.rows[0];

    // Activate the routine
    const result = await client.query(`
      UPDATE routine_templates
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING name
    `, [routineId, user.user_id]);

    client.release();

    if (result.rows.length === 0) {
      await bot.editMessageText('❌ Routine not found or access denied', { chat_id: chatId, message_id: messageId });
      return;
    }

    await bot.editMessageText(
      `✅ *Routine Activated!*\n\n"${result.rows[0].name}" is now active and will be included in routine generation.`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🚀 Generate Now', callback_data: `generate_routine_now_${routineId}` },
            { text: '⬅️ Back to Routines', callback_data: 'cmd_myroutines' }
          ]]
        }
      }
    );

  } catch (error) {
    console.error('Error activating routine:', error);
    await bot.editMessageText('❌ Error activating routine', { chat_id: chatId, message_id: messageId });
  }
};

// Helper function to deactivate routine
const handleDeactivateRoutine = async (chatId, messageId, routineId) => {
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
      await bot.editMessageText('❌ Please connect first using /login', { chat_id: chatId, message_id: messageId });
      return;
    }

    const user = userResult.rows[0];

    // Deactivate the routine
    const result = await client.query(`
      UPDATE routine_templates
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING name
    `, [routineId, user.user_id]);

    client.release();

    if (result.rows.length === 0) {
      await bot.editMessageText('❌ Routine not found or access denied', { chat_id: chatId, message_id: messageId });
      return;
    }

    await bot.editMessageText(
      `⏸️ *Routine Deactivated!*\n\n"${result.rows[0].name}" is now inactive and will not be included in routine generation.`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '▶️ Activate Again', callback_data: `activate_routine_${routineId}` },
            { text: '⬅️ Back to Routines', callback_data: 'cmd_myroutines' }
          ]]
        }
      }
    );

  } catch (error) {
    console.error('Error deactivating routine:', error);
    await bot.editMessageText('❌ Error deactivating routine', { chat_id: chatId, message_id: messageId });
  }
};

// Helper function to generate a specific routine immediately
const handleGenerateRoutineNow = async (chatId, messageId, routineId) => {
  try {
    const client = await pool.connect();

    // Get user info
    const userResult = await client.query(`
      SELECT utc.user_id, u.name, 
             COALESCE(utc.bot_name, 'Levi') as bot_name,
             COALESCE(utc.user_title, 'My Lord') as user_title
      FROM user_telegram_config utc
      JOIN users u ON utc.user_id = u.id
      WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
    `, [chatId]);

    if (userResult.rows.length === 0) {
      client.release();
      await bot.editMessageText('❌ Please connect first using /login', { chat_id: chatId, message_id: messageId });
      return;
    }

    const user = userResult.rows[0];

    // Get the specific routine
    const routineResult = await client.query(`
      SELECT * FROM routine_templates
      WHERE id = $1 AND user_id = $2 AND is_active = true
    `, [routineId, user.user_id]);

    if (routineResult.rows.length === 0) {
      client.release();
      await bot.editMessageText('❌ Routine not found or not active', { chat_id: chatId, message_id: messageId });
      return;
    }

    const routine = routineResult.rows[0];
    client.release();

    // Import routine service and generate tasks
    const routineService = await import('../services/routineService.js');
    const result = await routineService.default.generateDailyTasksFromTemplate(user.user_id, routine.id);

    if (!result.success) {
      await bot.editMessageText(
        `❌ ${user.bot_name} encountered an error, ${user.user_title}.\n\nFailed to generate routine "${routine.name}".\n\n${result.error || 'Unknown error'}`,
        { chat_id: chatId, message_id: messageId }
      );
      return;
    }

    const tasksGenerated = result.tasksGenerated || 0;

    if (tasksGenerated === 0) {
      await bot.editMessageText(
        `⚠️ ${user.bot_name} reports no new tasks generated, ${user.user_title}.\n\nThe routine "${routine.name}" may have already been deployed today.`,
        { chat_id: chatId, message_id: messageId }
      );
      return;
    }

    await bot.editMessageText(
      `✅ *${user.bot_name} Has Forged Your Tasks!*\n\n` +
      `🗓️ Routine: ${routine.name}\n` +
      `📋 *${tasksGenerated} tasks* added to your command, ${user.user_title}\n\n` +
      `Use /today to survey your battlefield!`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown'
      }
    );

  } catch (error) {
    console.error('Error generating routine:', error);
    await bot.editMessageText('❌ Error generating routine. Please try again.', { chat_id: chatId, message_id: messageId });
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

    // Prepare task data
    const taskData = {
      title: title,
      description: description,
      priority: finalPriority,
      category: finalCategory,
      time_start: finalTimeStart,
      time_end: finalTimeEnd
    };

    // Import task service and create task
    const taskService = await import('../services/taskService.js');
    const result = await taskService.default.createTask(userId, taskData);

    if (!result.success) {
      await bot.sendMessage(chatId, `❌ Error creating task: ${result.error}`);
      return;
    }

    const task = result.task;

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
    const title = parts[0] !== undefined && parts[0] !== '' ? parts[0] : currentTask.title;
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

    // Prepare update data
    const updateData = {
      title: title,
      description: description,
      priority: finalPriority,
      category: finalCategory,
      time_start: finalTimeStart,
      time_end: finalTimeEnd,
      status: finalStatus
    };

    // Import task service and update task
    const taskService = await import('../services/taskService.js');
    const result = await taskService.default.updateTask(taskId, userId, updateData);

    if (!result.success) {
      await bot.sendMessage(chatId, `❌ Error updating task: ${result.error}`);
      return;
    }

    const task = result.task;

    // Get bot name and user_title for personalized messages
    const client = await pool.connect();
    const userConfigResult = await client.query(`
      SELECT COALESCE(utc.bot_name, 'Levi') as bot_name,
             COALESCE(utc.user_title, 'My Lord') as user_title
      FROM user_telegram_config utc
      WHERE utc.user_id = $1
    `, [userId]);
    const botName = userConfigResult.rows[0]?.bot_name || 'Levi';
    const userTitle = userConfigResult.rows[0]?.user_title || 'My Lord';
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

${botName} has successfully refined your royal task, ${userTitle}:

${statusEmoji} ${categoryEmoji} *${task.title}*
${task.description ? `_${task.description}_\n` : ''}
${emoji} *Priority:* ${finalPriority.toUpperCase()}
📁 *Category:* ${finalCategory}
🕐 *Time:* ${finalTimeStart}${finalTimeEnd ? ` - ${finalTimeEnd}` : ''}
📊 *Status:* ${finalStatus}
${finalStatus !== 'done' && finalTimeStart ? '⏰ *Reminders:* Rescheduled' : ''}

*Changes Made:*
${changesMessage || 'No changes detected'}

Use /today to see your updated task list, ${userTitle}.
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

// Helper function to handle transaction input
const handleTransactionInput = async (chatId, input, userId, userName) => {
  try {
    console.log(`💰 handleTransactionInput called for user ${userId} (${userName})`);
    console.log(`📝 Input: "${input}"`);

    const parts = input.split('|').map(p => p.trim());
    console.log(`📋 Parts:`, parts);

    const type = parts[0]?.toLowerCase();
    const amount = parts[1];
    const category = parts[2];
    const description = parts[3];
    const date = parts[4];

    console.log(`📌 Parsed - Type: "${type}", Amount: "${amount}", Category: "${category}", Description: "${description}", Date: "${date}"`);

    // Validate type
    if (!type || !['income', 'expense'].includes(type)) {
      await bot.sendMessage(chatId,
        '❌ *Invalid Type*\n\n' +
        'Type must be "income" or "expense".\n\n' +
        '*Examples:*\n' +
        '`income | 5000000 | Salary | Monthly salary | 2025-12-10`\n' +
        '`expense | 50000 | Food | Lunch | 2025-12-10`\n\n' +
        'Use `/income <amount>` or `/expense <amount>` for quick entry.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Validate amount
    const amountNum = parseInt(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      await bot.sendMessage(chatId,
        '❌ *Invalid Amount*\n\n' +
        'Amount must be a positive number.\n\n' +
        '*Examples:*\n' +
        '`income | 5000000 | Salary | Monthly salary`\n' +
        '`expense | 50000 | Food | Lunch`\n\n' +
        'Use `/income <amount>` or `/expense <amount>` for quick entry.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Validate category
    if (!category || category.trim().length === 0) {
      await bot.sendMessage(chatId,
        '❌ *Invalid Category*\n\n' +
        'Category is required.\n\n' +
        '*Examples:*\n' +
        '`income | 5000000 | Salary | Monthly salary`\n' +
        '`expense | 50000 | Food | Lunch`\n\n' +
        'Use `/income <amount>` or `/expense <amount>` for quick entry.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Validate description
    if (!description || description.trim().length === 0) {
      await bot.sendMessage(chatId,
        '❌ *Invalid Description*\n\n' +
        'Description is required.\n\n' +
        '*Examples:*\n' +
        '`income | 5000000 | Salary | Monthly salary`\n' +
        '`expense | 50000 | Food | Lunch`\n\n' +
        'Use `/income <amount>` or `/expense <amount>` for quick entry.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Validate date (optional, YYYY-MM-DD format)
    let finalDate = null;
    if (date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        await bot.sendMessage(chatId,
          '❌ *Invalid Date Format*\n\n' +
          'Date must be in YYYY-MM-DD format.\n\n' +
          '*Examples:*\n' +
          '`income | 5000000 | Salary | Monthly salary | 2025-12-10`\n' +
          '`expense | 50000 | Food | Lunch` (uses today\'s date)\n\n' +
          'Use `/income <amount>` or `/expense <amount>` for quick entry.',
          { parse_mode: 'Markdown' }
        );
        return;
      }
      finalDate = date;
    }

    console.log(`✅ Validated - Type: "${type}", Amount: ${amountNum}, Category: "${category}", Description: "${description}", Date: "${finalDate}"`);

    // Create transaction
    const transaction = await createTransactionService(userId, amountNum, type, category, description, finalDate);

    // Use TelegramView to format the success response
    const response = TelegramView.formatTransactionCreated(transaction, user);

    await bot.sendMessage(chatId, response.text, response.options);

  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    await bot.sendMessage(chatId,
      `❌ Failed to add transaction: ${error.message}\n\nPlease try again with /income or /expense.`,
      { parse_mode: 'Markdown' }
    );
  }
};

// Helper function to handle transactions pagination
const handleTransactionsPage = async (chatId, messageId, page) => {
  try {
    // Check if user is verified using UserService
    const verificationResult = await UserService.verifyUserByChatId(chatId);

    if (!verificationResult.success) {
      await bot.answerCallbackQuery({ callback_query_id: null }, {
        text: '❌ Please connect first using /login',
        show_alert: true
      });
      return;
    }

    const user = verificationResult.user;

    // Get transactions for the page
    const resultTransactions = await getTransactionsService(user.user_id, {}, page, 10);

    // Use TelegramView to format the response
    const response = TelegramView.formatTransactions({
      success: true,
      data: {
        user: user,
        transactions: resultTransactions.transactions,
        pagination: resultTransactions.pagination
      }
    }, page, 10);

    await bot.editMessageText(response.text, {
      chat_id: chatId,
      message_id: messageId,
      ...response.options
    });

  } catch (error) {
    console.error('Error handling transactions page:', error);
    await bot.answerCallbackQuery({ callback_query_id: null }, {
      text: '❌ Error loading page',
      show_alert: true
    });
  }
};

// Helper function to handle today's transactions pagination
const handleTransactionsTodayPage = async (chatId, messageId, page) => {
  try {
    // Check if user is verified using UserService
    const verificationResult = await UserService.verifyUserByChatId(chatId);

    if (!verificationResult.success) {
      await bot.answerCallbackQuery({ callback_query_id: null }, {
        text: '❌ Please connect first using /login',
        show_alert: true
      });
      return;
    }

    const user = verificationResult.user;

    // Get today's date for filtering
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // Get transactions for today only
    const resultTransactions = await getTransactionsService(user.user_id, {
      dateFrom: todayStr,
      dateTo: todayStr
    }, page, 10);

    // Use TelegramView to format the response
    const response = TelegramView.formatTransactionsToday({
      success: true,
      data: {
        user: user,
        transactions: resultTransactions.transactions,
        pagination: resultTransactions.pagination
      }
    }, page, 10);

    await bot.editMessageText(response.text, {
      chat_id: chatId,
      message_id: messageId,
      ...response.options
    });

  } catch (error) {
    console.error('Error handling transactions today page:', error);
    await bot.answerCallbackQuery({ callback_query_id: null }, {
      text: '❌ Error loading page',
      show_alert: true
    });
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
    // Get user_title from database
    const client = await pool.connect();
    const userResult = await client.query(`
      SELECT COALESCE(user_title, 'My Lord') as user_title
      FROM user_telegram_config
      WHERE telegram_chat_id = $1
    `, [chatId]);
    client.release();

    const userTitle = userResult.rows.length > 0 ? userResult.rows[0].user_title : 'My Lord';

    const emoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
    const categoryEmoji = task.category === 'work' ? '💼' : task.category === 'learn' ? '📚' : '🧘';

    const message = `
${emoji} *Task Reminder, ${userTitle}*

${categoryEmoji} *${task.title}*
${task.description ? `\n_${task.description}_` : ''}

⏰ *Commences in ${minutesBefore} minutes*
🕐 *Time:* ${task.time_start} - ${task.time_end || 'No end time'}
📊 *Priority:* ${task.priority.toUpperCase()}
📁 *Category:* ${task.category}

May your royal productivity reign supreme! 💪
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
    // Get user_title from database
    const client = await pool.connect();
    const userResult = await client.query(`
      SELECT COALESCE(user_title, 'My Lord') as user_title
      FROM user_telegram_config
      WHERE telegram_chat_id = $1
    `, [chatId]);
    client.release();

    const userTitle = userResult.rows.length > 0 ? userResult.rows[0].user_title : 'My Lord';

    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const completedTasks = tasks.filter(t => t.status === 'done');

    let message = `
🌅 *Good Morning, ${userTitle} ${userName}!*

Here is your royal daily task summary for *${new Date().toLocaleDateString()}*

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

    message += '\nMay Your Majesty conquer all today! 💪🚀';

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
    // Get user_title from database
    const client = await pool.connect();
    const userResult = await client.query(`
      SELECT COALESCE(user_title, 'My Lord') as user_title
      FROM user_telegram_config
      WHERE telegram_chat_id = $1
    `, [chatId]);
    client.release();

    const userTitle = userResult.rows.length > 0 ? userResult.rows[0].user_title : 'My Lord';

    const message = `
🗓️ *Routine Generated, ${userTitle}*

Your royal routine "*${routineName}*" has been generated!

✅ *${tasksCount} tasks* have been added to your task list for today.

Check your LifePath app to commence your conquests, ${userTitle}! 📱
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
    // Get user_title from database
    const client = await pool.connect();
    const userResult = await client.query(`
      SELECT COALESCE(user_title, 'My Lord') as user_title
      FROM user_telegram_config
      WHERE telegram_chat_id = $1
    `, [chatId]);
    client.release();

    const userTitle = userResult.rows.length > 0 ? userResult.rows[0].user_title : 'My Lord';

    const message = `
⚠️ *Task Overdue, ${userTitle}*

*${task.title}* awaits your attention!

📅 *Due Date:* ${task.due_date}
📊 *Priority:* ${task.priority.toUpperCase()}

Your humble servant reminds you to complete this task, ${userTitle}! ⏰
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

// Send daily financial summary
export const sendDailyFinancialSummary = async (chatId, userName, summary, date) => {
  if (!bot) {
    console.error('❌ Telegram Bot not initialized');
    return { success: false, error: 'Bot not initialized' };
  }

  try {
    const { totalIncome, totalExpense, balance, transactionCount, topCategories } = summary;
    
    // Format currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };

    const balanceEmoji = balance >= 0 ? '📈' : '📉';
    const balanceStatus = balance >= 0 ? 'Surplus' : 'Deficit';

    let message = `
🌅 *Ringkasan Keuangan Harian*
📅 *${date}*

Salam hormat, *Yang Mulia ${userName}*! Berikut laporan keuangan Paduka hari ini:

💰 *Pemasukan:* ${formatCurrency(totalIncome)}
💸 *Pengeluaran:* ${formatCurrency(totalExpense)}
${balanceEmoji} *Saldo:* ${formatCurrency(balance)} (${balanceStatus})
📊 *Total Transaksi:* ${transactionCount}
`;

    if (topCategories && topCategories.length > 0) {
      message += '\n📁 *Top Kategori Pengeluaran:*\n';
      topCategories.slice(0, 3).forEach((cat, idx) => {
        const icons = ['🥇', '🥈', '🥉'];
        message += `${icons[idx]} ${cat.category}: ${formatCurrency(cat.total)}\n`;
      });
    }

    if (transactionCount === 0) {
      message = `
🌅 *Ringkasan Keuangan Harian*
📅 *${date}*

Salam hormat, *Yang Mulia ${userName}*! 📝

Belum ada transaksi kerajaan hari ini.
Jangan lupa catat pemasukan dan pengeluaran Paduka! 💪

Gunakan /income dan /expense untuk mencatat transaksi.
`;
    }

    message += '\n_Semoga keuangan kerajaan Paduka selalu sejahtera!_ 💪';

    const result = await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    return {
      success: true,
      messageId: result.message_id
    };

  } catch (error) {
    console.error('Error sending daily financial summary:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send monthly financial summary
export const sendMonthlyFinancialSummary = async (chatId, userName, summary, monthYear) => {
  if (!bot) {
    console.error('❌ Telegram Bot not initialized');
    return { success: false, error: 'Bot not initialized' };
  }

  try {
    const { 
      totalIncome, 
      totalExpense, 
      balance, 
      transactionCount, 
      avgDailyExpense,
      topIncomeCategories,
      topExpenseCategories,
      comparisonWithLastMonth 
    } = summary;
    
    // Format currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };

    const balanceEmoji = balance >= 0 ? '📈' : '📉';
    const balanceStatus = balance >= 0 ? 'Surplus' : 'Deficit';

    let message = `
📊 *Ringkasan Keuangan Bulanan*
🗓️ *${monthYear}*

Salam hormat, *Yang Mulia ${userName}*! Berikut laporan keuangan kerajaan bulan lalu:

━━━━━━━━━━━━━━━━━━━━
💰 *RINGKASAN UTAMA*
━━━━━━━━━━━━━━━━━━━━
📥 *Total Pemasukan:* ${formatCurrency(totalIncome)}
📤 *Total Pengeluaran:* ${formatCurrency(totalExpense)}
${balanceEmoji} *Saldo Akhir:* ${formatCurrency(balance)} (${balanceStatus})
📊 *Jumlah Transaksi:* ${transactionCount}
💵 *Rata-rata Pengeluaran/Hari:* ${formatCurrency(avgDailyExpense || 0)}
`;

    if (topIncomeCategories && topIncomeCategories.length > 0) {
      message += '\n━━━━━━━━━━━━━━━━━━━━\n📥 *TOP SUMBER PEMASUKAN*\n━━━━━━━━━━━━━━━━━━━━\n';
      topIncomeCategories.slice(0, 3).forEach((cat, idx) => {
        const icons = ['🥇', '🥈', '🥉'];
        message += `${icons[idx]} ${cat.category}: ${formatCurrency(cat.total)}\n`;
      });
    }

    if (topExpenseCategories && topExpenseCategories.length > 0) {
      message += '\n━━━━━━━━━━━━━━━━━━━━\n📤 *TOP PENGELUARAN*\n━━━━━━━━━━━━━━━━━━━━\n';
      topExpenseCategories.slice(0, 5).forEach((cat, idx) => {
        const icons = ['🔴', '🟠', '🟡', '🟢', '🔵'];
        message += `${icons[idx]} ${cat.category}: ${formatCurrency(cat.total)}\n`;
      });
    }

    if (comparisonWithLastMonth) {
      const diff = comparisonWithLastMonth.expenseDifference;
      const diffEmoji = diff <= 0 ? '✅' : '⚠️';
      const diffText = diff <= 0 ? 'lebih hemat' : 'lebih boros';
      message += `\n━━━━━━━━━━━━━━━━━━━━\n📈 *PERBANDINGAN BULAN LALU*\n━━━━━━━━━━━━━━━━━━━━\n${diffEmoji} Pengeluaran ${Math.abs(diff).toFixed(1)}% ${diffText}\n`;
    }

    if (transactionCount === 0) {
      message = `
📊 *Ringkasan Keuangan Bulanan*
🗓️ *${monthYear}*

Salam hormat, *Yang Mulia ${userName}*! 📝

Belum ada transaksi kerajaan bulan lalu.
Mulai catat keuangan Paduka di bulan ini! 💪
`;
    }

    message += '\n_Semoga keuangan kerajaan Paduka semakin makmur!_ 🚀';

    const result = await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    return {
      success: true,
      messageId: result.message_id
    };

  } catch (error) {
    console.error('Error sending monthly financial summary:', error);
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
    console.log('🔄 Shutting down Levi...');

    // Clear all login timeouts
    for (const [chatId, timeout] of loginTimeouts) {
      clearTimeout(timeout);
      console.log(`🧹 Cleared login timeout for chat ${chatId}`);
    }
    loginTimeouts.clear();

    // Clear all logout timeouts from user states
    for (const [chatId, userState] of userStates) {
      if (userState.timeoutId) {
        clearTimeout(userState.timeoutId);
        console.log(`🧹 Cleared logout timeout for chat ${chatId}`);
      }
    }

    bot.stopPolling();
    isInitialized = false;
    console.log('✅ Levi shutdown completed');
  }
};

export default {
  initializeTelegramBot,
  sendTaskReminder,
  sendDailySummary,
  sendRoutineGenerationNotice,
  sendOverdueAlert,
  sendDailyFinancialSummary,
  sendMonthlyFinancialSummary,
  getBot,
  isBotInitialized,
  shutdownTelegramBot
};