import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { pool } from '../config/db.js';

dotenv.config();

let bot = null;
let isInitialized = false;

// Store user states for multi-step commands
const userStates = new Map();

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
      { command: 'status', description: '📊 Check connection & settings' },
      { command: 'addtask', description: '➕ Add new task' },
      { command: 'today', description: '📅 View today\'s tasks' },
      { command: 'myroutines', description: '📋 View my routines' },
      { command: 'createroutine', description: '✨ Create new routine template' },
      { command: 'generateroutine', description: '🔄 Generate daily routine' },
      { command: 'help', description: '📚 Show help & commands' },
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

  // Handle callback queries from inline buttons
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    // Answer callback to remove loading state
    await bot.answerCallbackQuery(query.id);

    try {
      switch (data) {
        case 'cmd_login':
          await bot.sendMessage(chatId, 
            '🔐 *Login Command*\n\n' +
            'To login, use this format:\n' +
            '\`/login your-email@example.com\`\n\n' +
            'Example:\n' +
            '\`/login radif@gmail.com\`\n\n' +
            'After sending, I\'ll ask for your password.',
            { parse_mode: 'Markdown' }
          );
          break;

        case 'cmd_status':
          // Execute status command directly
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
              break;
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
          break;

        case 'cmd_addtask':
          // Execute addtask command directly
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
                '❌ *Not Connected*\n\n' +
                'Please connect your Telegram account first using /verify or /login',
                { parse_mode: 'Markdown' }
              );
              break;
            }

            const user = result.rows[0];

            // Set user state to await task input
            userStates.set(chatId, {
              action: 'awaiting_task_input',
              userId: user.user_id,
              userName: user.name
            });

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
\`/addtask Meeting | Discuss goals | high | work | 09:00 | 10:00\`

⚠️ *Note:* TimeStart is required to enable task reminders!
            `;

            await bot.sendMessage(chatId, addTaskMessage, { parse_mode: 'Markdown' });
          } catch (error) {
            console.error('Error in addtask callback:', error);
            await bot.sendMessage(chatId, '❌ Error processing request. Please try again.');
          }
          break;

        case 'cmd_today':
          // Execute today command directly
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
                '❌ *Not Connected*\n\n' +
                'Please connect your Telegram account first using /verify or /login',
                { parse_mode: 'Markdown' }
              );
              break;
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
              break;
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

            if (inProgressTasks.length > 0) {
              message += '\n\n🔄 *IN PROGRESS:*\n';
              inProgressTasks.forEach((task, idx) => {
                const categoryEmoji = task.category === 'work' ? '💼' : task.category === 'learn' ? '📚' : '🧘';
                message += `\n${idx + 1}. ${categoryEmoji} *${task.title}*`;
              });
            }

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
            console.error('Error in today callback:', error);
            await bot.sendMessage(chatId, '❌ Error fetching tasks. Please try again.');
          }
          break;

        case 'cmd_help':
          // Execute help command directly
          const helpMessage = `
📚 *LifePath Reminder Bot Help*

*Available Commands:*

*Connection:*
/start - Welcome message and setup guide
/login <email> - Login directly from Telegram
/verify <code> - Link with code from app
/status - Check your connection and settings

*Task Management:*
/addtask - Add a new task
/today - View today's tasks

*Routine Management:*
/myroutines - View all routine templates
/createroutine - Create new routine template
/addtasktoroutine <id> - Add task to routine
/generateroutine <id> - Generate daily tasks

*Other:*
/menu - Show command menu with buttons
/help - Show this help message
/cancel - Cancel current operation

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
\`Title | Description | Priority | Category | TimeStart | TimeEnd\`

Example:
\`Team Meeting | Discuss Q4 goals | high | work | 09:00 | 10:00\`

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

          const helpKeyboard = {
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
            reply_markup: helpKeyboard
          });
          break;

        case 'cmd_menu':
          // Execute menu command directly
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
• \`/createroutine\` - Create new routine
• \`/generateroutine\` - Generate daily tasks

*Information:*
• \`/status\` - Check connection status
• \`/help\` - Get help & documentation

*Quick Actions:*
Use the buttons below for quick access! 👇
          `;

          const menuKeyboard = {
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
            reply_markup: menuKeyboard
          });
          break;

        case 'guide_login':
          await bot.sendMessage(chatId,
            '📖 *Login Guide*\n\n' +
            '*Step 1:* Send login command\n' +
            '\`/login your-email@example.com\`\n\n' +
            '*Step 2:* Wait for password prompt\n\n' +
            '*Step 3:* Send your LifePath password\n' +
            '(Message will be deleted automatically)\n\n' +
            '*Step 4:* Get confirmation!\n' +
            '✅ You\'re connected!\n\n' +
            '*Security:* Your password is never stored and deleted immediately after verification.',
            { parse_mode: 'Markdown' }
          );
          break;

        case 'guide_verify':
          await bot.sendMessage(chatId,
            '📖 *Verify Guide*\n\n' +
            '*Step 1:* Open LifePath app/web\n\n' +
            '*Step 2:* Go to Settings → Telegram\n\n' +
            '*Step 3:* Click "Connect Telegram"\n\n' +
            '*Step 4:* Copy the verification code\n' +
            '(Example: ABC123)\n\n' +
            '*Step 5:* Come back here and send:\n' +
            '\`/verify ABC123\`\n\n' +
            '*Step 6:* Get confirmation!\n' +
            '✅ Connected!\n\n' +
            '*Note:* Code expires in 10 minutes.',
            { parse_mode: 'Markdown' }
          );
          break;

        case 'cmd_myroutines':
          // Trigger myroutines command - simulate command
          setTimeout(() => {
            bot.processUpdate({
              update_id: Date.now(),
              message: {
                message_id: Date.now(),
                from: query.from,
                chat: query.message.chat,
                date: Date.now(),
                text: '/myroutines'
              }
            });
          }, 100);
          break;

        case 'generate_all_routines':
          // Generate all active routines
          try {
            const client = await pool.connect();

            const userResult = await client.query(`
              SELECT utc.user_id, u.name
              FROM user_telegram_config utc
              JOIN users u ON utc.user_id = u.id
              WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
            `, [chatId]);

            if (userResult.rows.length === 0) {
              client.release();
              await bot.sendMessage(chatId, '❌ Not connected. Please use /verify or /login first.');
              break;
            }

            const user = userResult.rows[0];
            client.release();

            await bot.sendMessage(chatId, '🔄 Generating all active routines... Please wait.');

            const routineService = await import('./routineService.js');
            const result = await routineService.generateAllDailyRoutines(user.user_id);

            if (result.totalTasksGenerated === 0) {
              await bot.sendMessage(chatId,
                '📋 *Generation Complete*\n\n' +
                `${result.message}\n\n` +
                `✅ Successful: ${result.successfulGenerations}\n` +
                `⏭️ Skipped: ${result.skippedGenerations}\n` +
                `❌ Failed: ${result.failedGenerations}`,
                { parse_mode: 'Markdown' }
              );
            } else {
              let message = `
✅ *All Routines Generated!*

📅 *Date:* ${result.generationDate}
📋 *Routines Processed:* ${result.totalTemplates}
✅ *Tasks Created:* ${result.totalTasksGenerated}

*Summary:*
• Generated: ${result.successfulGenerations}
• Skipped: ${result.skippedGenerations}
• Failed: ${result.failedGenerations}

Your daily tasks are ready! 🎉
              `;

              await bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [[
                    { text: '📅 View Today\'s Tasks', callback_data: 'cmd_today' }
                  ]]
                }
              });
            }
          } catch (error) {
            console.error('Error generating all routines:', error);
            await bot.sendMessage(chatId, `❌ Failed to generate routines: ${error.message}`);
          }
          break;

        default:
          // Handle dynamic callbacks like add_task_routine_*
          if (data.startsWith('add_task_routine_')) {
            const routineId = data.replace('add_task_routine_', '');
            
            // Trigger addtasktoroutine command
            setTimeout(() => {
              bot.processUpdate({
                update_id: Date.now(),
                message: {
                  message_id: Date.now(),
                  from: query.from,
                  chat: query.message.chat,
                  date: Date.now(),
                  text: `/addtasktoroutine ${routineId}`
                }
              });
            }, 100);
          } else {
            console.log(`Unknown callback data: ${data}`);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling callback query:', error);
      await bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
    }
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

  // /addtask command - Add new task
  bot.onText(/\/addtask(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const taskDetails = match[1]; // Text after /addtask (if any)
    
    console.log(`📝 /addtask command received from ${msg.from.username || msg.from.first_name} (${chatId})`);
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
\`/addtask Meeting | Discuss goals | high | work | 09:00 | 10:00\`

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
    } else if (userState.action === 'awaiting_password') {
      // This is handled by the one-time handler in /login
      // Don't interfere
      console.log(`🔐 Awaiting password, skipping...`);
      return;
    }
  });

  console.log('✅ Telegram Bot command handlers registered');
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
        'Try again with /addtask',
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