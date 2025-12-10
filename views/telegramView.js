/**
 * Telegram View
 * Handles message formatting and presentation for Telegram bot
 * Separated from controller logic (telegramController.js)
 */

export class TelegramView {
  /**
   * Format myroutines response
   */
  static formatMyRoutines(result) {
    if (!result.success) {
      return {
        text: `❌ *Error*\n\n${result.error || 'Failed to fetch routines'}`,
        options: { parse_mode: 'Markdown' }
      };
    }

    const { user, routines } = result.data;

    if (routines.length === 0) {
      return {
        text: `📋 *${user.bot_name || 'Assistant'} Presents Your Routines*\n\n${user.bot_name || 'Assistant'} reports that you have no routine templates yet.\n\nCreate your first routine template in the LifePath app!`,
        options: {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '➕ Create New Routine', callback_data: 'cmd_addroutine' }
            ]]
          }
        }
      };
    }

    const activeRoutines = routines.filter(r => r.is_active);
    const inactiveRoutines = routines.filter(r => !r.is_active);

    let message = `
📋 *${user.bot_name || 'Assistant'} Presents Your Routine Arsenal*

${user.bot_name || 'Assistant'} has prepared ${routines.length} routine template${routines.length > 1 ? 's' : ''} for your command:

`;

    if (activeRoutines.length > 0) {
      message += '\n\n✅ *ACTIVE ROUTINES READY FOR BATTLE:*\n';
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
      message += '\n\n⏸️  *INACTIVE ROUTINES IN RESERVE:*\n';
      inactiveRoutines.forEach((routine, idx) => {
        const statusEmoji = routine.has_tasks ? '📝' : '⚠️';
        message += `\n${idx + 1}. ${statusEmoji} ${routine.name}`;
        message += `\n   📋 ${routine.tasks_count} task${routine.tasks_count !== 1 ? 's' : ''}`;
        message += `\n   📅 Created: ${new Date(routine.created_at).toLocaleDateString()}\n`;
      });
    }

    message += '\n💡 *Quick Actions:*';
    message += '\n• Use buttons below to manage routines';
    message += '\n• Tap routine name to see options';

    // Create keyboard
    const keyboard = { inline_keyboard: [] };

    // Add buttons for active routines
    if (activeRoutines.length > 0) {
      activeRoutines.forEach((routine) => {
        keyboard.inline_keyboard.push([
          { text: `📝 ${routine.name}`, callback_data: `routine_manage_${routine.id}` },
          { text: '🚀 Generate', callback_data: `generate_routine_now_${routine.id}` }
        ]);
      });
    }

    // Add buttons for inactive routines
    if (inactiveRoutines.length > 0) {
      inactiveRoutines.forEach((routine) => {
        keyboard.inline_keyboard.push([
          { text: `📝 ${routine.name}`, callback_data: `routine_manage_${routine.id}` },
          { text: '▶️ Activate', callback_data: `activate_routine_${routine.id}` }
        ]);
      });
    }

    // Add general action buttons
    keyboard.inline_keyboard.push([
      { text: '🚀 Generate All Active', callback_data: 'generate_all_routines' },
      { text: '➕ Create New Routine', callback_data: 'cmd_addroutine' }
    ]);
    keyboard.inline_keyboard.push([
      { text: '🔄 Refresh List', callback_data: 'cmd_myroutines' },
      { text: '📊 View Today\'s Tasks', callback_data: 'cmd_today' }
    ]);

    return {
      text: message,
      options: {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    };
  }

  /**
   * Format today tasks response
   */
  static formatTodayTasks(result) {
    if (!result.success) {
      return {
        text: `❌ *Error*\n\n${result.error || 'Failed to fetch tasks'}`,
        options: { parse_mode: 'Markdown' }
      };
    }

    const { user, tasks, date } = result.data;

    if (tasks.length === 0) {
      return {
        text: `📅 *Today's Tasks*\n\nMy Lord, ${user.bot_name || 'Assistant'} confirms you have no scheduled tasks for today!\n\n🎉 No tasks for today!\n\nUse /addtask to create a new task.`,
        options: {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '➕ Add Task', callback_data: 'cmd_addtask' }
            ]]
          }
        }
      };
    }

    // Group tasks by status
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const completedTasks = tasks.filter(t => t.status === 'done');

    let message = `
📅 *Today's Tasks* - ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}

${user.bot_name || 'Assistant'} presents your daily task overview:

📊 *Overview:*
• Pending: ${pendingTasks.length}
• In Progress: ${inProgressTasks.length}
• Completed: ${completedTasks.length}
• *Total:* ${tasks.length}
`;

    // Show pending tasks
    if (pendingTasks.length > 0) {
      message += '\n\n📋 *PENDING TASKS:*\n';
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

    return {
      text: message,
      options: {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '➕ Add Task', callback_data: 'cmd_addtask' },
            { text: '🔄 Refresh', callback_data: 'cmd_today' }
          ]]
        }
      }
    };
  }

  /**
   * Format my tasks response
   */
  static formatMyTasks(result) {
    if (!result.success) {
      return {
        text: `❌ *Error*\n\n${result.error || 'Failed to fetch tasks'}`,
        options: { parse_mode: 'Markdown' }
      };
    }

    const { user, tasks } = result.data;

    if (tasks.length === 0) {
      return {
        text: `📋 *My Tasks*\n\nMy Lord, ${user.bot_name || 'Assistant'} reports that your task list is currently empty!\n\n✨ No active tasks!\n\nTap button below to add your first task.`,
        options: {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '➕ Add New Task', callback_data: 'cmd_addtask' }
            ]]
          }
        }
      };
    }

    const intro = `📋 *My Active Tasks* (${tasks.length})\n\n` +
      `My Lord, ${user.bot_name || 'Assistant'} presents your current task roster:\n\n` +
      `Tap action buttons below each task:\n` +
      `✅ Complete | ✏️ Edit | 🗑️ Delete`;

    return {
      text: intro,
      options: { parse_mode: 'Markdown' },
      tasks: tasks // Return tasks separately for individual formatting
    };
  }

  /**
   * Format task completion response
   */
  static formatTaskCompleted(result) {
    if (!result.success) {
      return {
        text: `❌ *Error*\n\n${result.error || 'Failed to complete task'}`,
        options: { parse_mode: 'Markdown' }
      };
    }

    const { task } = result.data;

    return {
      text: `✅ *Task Completed!*\n\nGreat job completing:\n~~${task.title}~~\n\nKeep up the momentum! 🎉`,
      options: { parse_mode: 'Markdown' }
    };
  }

  /**
   * Format verification success
   */
  static formatVerificationSuccess(result) {
    if (!result.success) {
      return {
        text: `❌ *Verification Failed*\n\n${result.error || 'Invalid verification code'}`,
        options: { parse_mode: 'Markdown' }
      };
    }

    const { userConfig } = result.data;

    const successMessage = `
✅ *Verification Successful!*

Welcome aboard, ${userConfig.name}! 🎉

Your Telegram account is now linked to LifePath.

*What's Next?*
• Configure your reminder preferences in the app
• I'll send you reminders before your tasks start
• Get daily summaries of your tasks
• Receive notifications for routine generation

*Quick Tips:*
• Use /status to check your connection
• Use /help for more information
• Manage settings in the LifePath app

Let's make your day productive! 💪
    `;

    return {
      text: successMessage,
      options: { parse_mode: 'Markdown' }
    };
  }

  /**
   * Format login success
   */
  static formatLoginSuccess(result) {
    if (!result.success) {
      return {
        text: `❌ *Login Failed*\n\n${result.error || 'Authentication failed'}`,
        options: { parse_mode: 'Markdown' }
      };
    }

    const { user } = result.data;

    return {
      text: `✅ *Login Successful!*\n\nWelcome back, ${user.name}!\n\nYour Telegram account is now connected to LifePath.`,
      options: { parse_mode: 'Markdown' }
    };
  }

  /**
   * Format logout success
   */
  static formatLogoutSuccess(result) {
    if (!result.success) {
      return {
        text: `❌ *Logout Failed*\n\n${result.error || 'Logout failed'}`,
        options: { parse_mode: 'Markdown' }
      };
    }

    const { user } = result.data;

    return {
      text: `🚪 *Logged Out Successfully*\n\nGoodbye, ${user.name}!\n\nYour Telegram account has been disconnected from LifePath.`,
      options: { parse_mode: 'Markdown' }
    };
  }

  /**
   * Format status response
   */
  static formatStatus(result) {
    if (!result.success) {
      return {
        text: `❌ *Not Connected*\n\nYour Telegram account is not linked to LifePath.\nUse /verify <code> to connect your account.`,
        options: { parse_mode: 'Markdown' }
      };
    }

    const { config } = result.data;

    const statusMessage = `
✅ *Connection Status*

${config.bot_name || 'Assistant'} here with your account status report:

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

    return {
      text: statusMessage,
      options: { parse_mode: 'Markdown' }
    };
  }

  /**
   * Format transactions list response
   */
  static formatTransactions(result, page = 1, limit = 10) {
    if (!result.success) {
      return {
        text: `❌ *Error*\n\n${result.error || 'Failed to fetch transactions'}`,
        options: { parse_mode: 'Markdown' }
      };
    }

    const { user, transactions, pagination } = result.data;

    if (transactions.length === 0) {
      return {
        text: `💰 *${user.bot_name || 'Assistant'} Presents Your Financial Records*\n\n${user.bot_name || 'Assistant'} reports that you have no transaction records yet.\n\nStart tracking your finances with /addtransaction or use quick commands!`,
        options: {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📈 Add Income', callback_data: 'cmd_income' },
                { text: '📉 Add Expense', callback_data: 'cmd_expense' }
              ],
              [
                { text: '➕ Full Entry', callback_data: 'cmd_addtransaction' }
              ]
            ]
          }
        }
      };
    }

    let message = `💰 *${user.bot_name || 'Assistant'} Presents Your Financial Records*\n\n`;
    message += `*Page ${page} of ${pagination.totalPages}* (${pagination.totalItems} total transactions)\n\n`;

    transactions.forEach((transaction, index) => {
      const emoji = transaction.type === 'income' ? '📈' : '📉';
      const amount = new Intl.NumberFormat('id-ID').format(transaction.amount);
      const date = new Date(transaction.transaction_date).toLocaleDateString('id-ID');

      message += `${emoji} *${transaction.category}*\n`;
      message += `💰 Rp ${amount}\n`;
      message += `📄 ${transaction.description}\n`;
      message += `📅 ${date}\n\n`;
    });

    // Create pagination buttons
    const keyboard = [];

    if (pagination.hasPrevPage || pagination.hasNextPage) {
      const paginationRow = [];
      if (pagination.hasPrevPage) {
        paginationRow.push({
          text: '⬅️ Previous',
          callback_data: `transactions_page_${page - 1}`
        });
      }
      if (pagination.hasNextPage) {
        paginationRow.push({
          text: 'Next ➡️',
          callback_data: `transactions_page_${page + 1}`
        });
      }
      keyboard.push(paginationRow);
    }

    // Add action buttons
    keyboard.push([
      { text: '📈 Add Income', callback_data: 'cmd_income' },
      { text: '📉 Add Expense', callback_data: 'cmd_expense' }
    ]);

    return {
      text: message,
      options: {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      }
    };
  }

  /**
   * Format today's transactions response
   */
  static formatTransactionsToday(result, page = 1, limit = 10) {
    if (!result.success) {
      return {
        text: `❌ *Error*\n\n${result.error || 'Failed to fetch today\'s transactions'}`,
        options: { parse_mode: 'Markdown' }
      };
    }

    const { user, transactions, pagination } = result.data;

    if (transactions.length === 0) {
      return {
        text: `📅 *${user.bot_name || 'Assistant'} Presents Today's Financial Records*\n\n${user.bot_name || 'Assistant'} reports that you have no transaction records for today.\n\nStart tracking your finances with /addtransaction or use quick commands!`,
        options: {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📈 Add Income', callback_data: 'cmd_income' },
                { text: '📉 Add Expense', callback_data: 'cmd_expense' }
              ],
              [
                { text: '➕ Full Entry', callback_data: 'cmd_addtransaction' }
              ]
            ]
          }
        }
      };
    }

    let message = `📅 *${user.bot_name || 'Assistant'} Presents Today's Financial Records*\n\n`;
    message += `*Page ${page} of ${pagination.totalPages}* (${pagination.totalItems} transactions today)\n\n`;

    transactions.forEach((transaction, index) => {
      const emoji = transaction.type === 'income' ? '📈' : '📉';
      const amount = new Intl.NumberFormat('id-ID').format(transaction.amount);
      const date = new Date(transaction.transaction_date).toLocaleDateString('id-ID');

      message += `${emoji} *${transaction.category}*\n`;
      message += `💰 Rp ${amount}\n`;
      message += `📄 ${transaction.description}\n`;
      message += `📅 ${date}\n\n`;
    });

    const keyboard = [];

    // Add pagination buttons if needed
    if (pagination.totalPages > 1) {
      const paginationRow = [];

      if (pagination.hasPrevPage) {
        paginationRow.push({
          text: '⬅️ Previous',
          callback_data: `transactions_today_page_${page - 1}`
        });
      }

      paginationRow.push({
        text: `${page}/${pagination.totalPages}`,
        callback_data: 'noop'
      });

      if (pagination.hasNextPage) {
        paginationRow.push({
          text: 'Next ➡️',
          callback_data: `transactions_today_page_${page + 1}`
        });
      }

      keyboard.push(paginationRow);
    }

    // Add action buttons
    keyboard.push([
      { text: '📈 Add Income', callback_data: 'cmd_income' },
      { text: '📉 Add Expense', callback_data: 'cmd_expense' }
    ]);

    return {
      text: message,
      options: {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      }
    };
  }

  /**
   * Format transaction summary response
   */
  static formatTransactionSummary(result) {
    if (!result.success) {
      return {
        text: `❌ *Error*\n\n${result.error || 'Failed to fetch transaction summary'}`,
        options: { parse_mode: 'Markdown' }
      };
    }

    const { user, summary } = result.data;

    const totalIncome = new Intl.NumberFormat('id-ID').format(summary.totalIncome);
    const totalExpense = new Intl.NumberFormat('id-ID').format(summary.totalExpense);
    const netAmount = summary.balance; // Fixed: was summary.netAmount
    const netFormatted = new Intl.NumberFormat('id-ID').format(Math.abs(netAmount));
    const netEmoji = netAmount >= 0 ? '📈' : '📉';
    const netText = netAmount >= 0 ? 'Surplus' : 'Deficit';

    let message = `📊 *${user.bot_name || 'Assistant'} Presents Your Financial Summary*\n\n`;

    message += `📈 *INCOME:* Rp ${totalIncome}\n`;
    message += `📉 *EXPENSE:* Rp ${totalExpense}\n`;
    message += `${netEmoji} *${netText}:* Rp ${netFormatted}\n\n`;

    if (summary.recentTransactions && summary.recentTransactions.length > 0) {
      message += `*Recent Transactions:*\n`;
      summary.recentTransactions.slice(0, 5).forEach((transaction, index) => {
        const emoji = transaction.type === 'income' ? '📈' : '📉';
        const amount = new Intl.NumberFormat('id-ID').format(transaction.amount);
        const date = new Date(transaction.transaction_date).toLocaleDateString('id-ID');

        message += `${index + 1}. ${emoji} ${transaction.category} - Rp ${amount} (${date})\n`;
      });

      if (summary.recentTransactions.length > 5) {
        message += `\n...and ${summary.recentTransactions.length - 5} more\n`;
      }
    }

    return {
      text: message,
      options: {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📈 Add Income', callback_data: 'cmd_income' },
              { text: '📉 Add Expense', callback_data: 'cmd_expense' }
            ],
            [
              { text: '📋 View All', callback_data: 'cmd_transactions' }
            ]
          ]
        }
      }
    };
  }

  /**
   * Format transaction creation success response
   */
  static formatTransactionCreated(transaction, user) {
    const emoji = transaction.type === 'income' ? '📈' : '📉';
    const amountFormatted = new Intl.NumberFormat('id-ID').format(transaction.amount);
    const dateDisplay = new Date(transaction.transaction_date).toLocaleDateString('id-ID');

    const successMessage = `
✅ *Transaction Recorded!*

${emoji} *${transaction.type.toUpperCase()}*
💰 *Amount:* Rp ${amountFormatted}
📁 *Category:* ${transaction.category}
📄 *Description:* ${transaction.description}
📅 *Date:* ${dateDisplay}

Your financial record has been saved successfully!

Use /transactions to view all records.
    `;

    return {
      text: successMessage,
      options: {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              transaction.type === 'income'
                ? { text: '➕ Add Expense', callback_data: 'cmd_expense' }
                : { text: '➕ Add Income', callback_data: 'cmd_income' },
              { text: '📋 View All', callback_data: 'cmd_transactions' }
            ]
          ]
        }
      }
    };
  }

  /**
   * Format quick transaction command help
   */
  static formatQuickTransactionHelp(command, type) {
    const emoji = type === 'income' ? '📈' : '📉';
    const commandName = command === 'income' ? 'Income' : 'Expense';
    const exampleAmount = type === 'income' ? '50000' : '25000';

    const helpMessage = `${emoji} *Quick ${commandName} Entry*\n\n` +
      `Enter the ${type} amount:\n\n` +
      `*Example:*\n` +
      `\`/${command} ${exampleAmount}\`\n\n` +
      `This will record Rp ${new Intl.NumberFormat('id-ID').format(parseInt(exampleAmount))} as ${type}.`;

    return {
      text: helpMessage,
      options: { parse_mode: 'Markdown' }
    };
  }
}

export default TelegramView;