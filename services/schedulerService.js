import cron from 'node-cron';
import * as routineService from '../services/routineService.js';
import * as routineModel from '../models/routineModel.js';
import * as reminderService from '../services/reminderService.js';
import * as transactionService from '../services/transactionService.js';
import * as telegramService from '../services/telegramService.js';
import { pool } from '../config/db.js';
import moment from 'moment-timezone';

/**
 * Scheduler Service
 * Handles automated daily routine generation and smart reminders
 */

let isSchedulerRunning = false;
let scheduledTasks = [];

// Generate daily routines for all users
const generateDailyRoutinesForAllUsers = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🗓️ Starting automated daily routine generation...');
    
    // Get all users who have active routine templates
    const usersWithRoutines = await client.query(`
      SELECT DISTINCT u.id as user_id, u.email, COUNT(rt.id) as routine_count
      FROM users u
      JOIN routine_templates rt ON u.id = rt.user_id
      WHERE rt.is_active = true
      GROUP BY u.id, u.email
      HAVING COUNT(rt.id) > 0
      ORDER BY u.id
    `);
    
    if (usersWithRoutines.rows.length === 0) {
      console.log('📝 No users with active routine templates found');
      return {
        success: true,
        message: 'No users with active routines',
        processedUsers: 0,
        totalTasksGenerated: 0
      };
    }
    
    console.log(`👥 Found ${usersWithRoutines.rows.length} users with active routine templates`);
    
    let processedUsers = 0;
    let totalTasksGenerated = 0;
    let totalSuccessfulGenerations = 0;
    let totalFailedGenerations = 0;
    let totalSkippedGenerations = 0;
    
    // Generate routines for each user
    for (const user of usersWithRoutines.rows) {
      try {
        console.log(`🔄 Processing routines for user: ${user.email} (${user.routine_count} templates)`);
        
        const result = await routineService.generateAllDailyRoutines(user.user_id);
        
        processedUsers++;
        totalTasksGenerated += result.totalTasksGenerated || 0;
        totalSuccessfulGenerations += result.successfulGenerations || 0;
        totalFailedGenerations += result.failedGenerations || 0;
        totalSkippedGenerations += result.skippedGenerations || 0;
        
        if (result.totalTasksGenerated > 0) {
          console.log(`  ✅ Generated ${result.totalTasksGenerated} tasks from ${result.successfulGenerations} routines`);
        } else {
          console.log(`  ⏭️ Skipped ${result.skippedGenerations} routines (already generated)`);
        }
        
      } catch (error) {
        console.error(`  ❌ Failed to generate routines for user ${user.email}:`, error.message);
        totalFailedGenerations++;
      }
    }
    
    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      processedUsers,
      totalTasksGenerated,
      totalSuccessfulGenerations,
      totalFailedGenerations,
      totalSkippedGenerations
    };
    
    console.log('🎉 Daily routine generation completed:');
    console.log(`   👥 Users processed: ${processedUsers}`);
    console.log(`   ✅ Successful generations: ${totalSuccessfulGenerations}`);
    console.log(`   ⏭️ Skipped generations: ${totalSkippedGenerations}`);
    console.log(`   ❌ Failed generations: ${totalFailedGenerations}`);
    console.log(`   📋 Total tasks generated: ${totalTasksGenerated}`);
    
    return summary;
    
  } catch (error) {
    console.error('❌ Critical error in daily routine generation:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Schedule daily routine generation
export const startDailyRoutineScheduler = () => {
  if (isSchedulerRunning) {
    console.log('⚠️ Daily routine scheduler is already running');
    return;
  }
  
  // Schedule at 6:00 AM every day
  const dailyTask = cron.schedule('0 6 * * *', async () => {
    try {
      await generateDailyRoutinesForAllUsers();
    } catch (error) {
      console.error('❌ Daily routine scheduler error:', error);
    }
  }, {
    scheduled: false,
    timezone: "Asia/Jakarta" // Adjust timezone as needed
  });
  
  // Schedule at midnight for early risers (optional)
  const midnightTask = cron.schedule('0 0 * * *', async () => {
    try {
      console.log('🌙 Running midnight routine generation...');
      await generateDailyRoutinesForAllUsers();
    } catch (error) {
      console.error('❌ Midnight routine scheduler error:', error);
    }
  }, {
    scheduled: false,
    timezone: "Asia/Jakarta"
  });
  
  // Start the scheduled tasks
  dailyTask.start();
  midnightTask.start();
  
  scheduledTasks.push(
    { name: 'daily-6am', task: dailyTask, cron: '0 6 * * *' },
    { name: 'daily-midnight', task: midnightTask, cron: '0 0 * * *' }
  );
  
  isSchedulerRunning = true;
  
  console.log('🚀 Daily routine scheduler started:');
  console.log('   📅 Daily generation at 06:00 AM');
  console.log('   🌙 Midnight generation at 00:00 AM');
  console.log('   🌏 Timezone: Asia/Jakarta');
};

// ============================================
// FINANCIAL SUMMARY SCHEDULER
// ============================================

/**
 * Send daily financial summary to all users with Telegram connected
 * Runs every day at 21:00 (9 PM) - end of day summary
 */
const sendDailyFinancialSummaryToAllUsers = async () => {
  try {
    console.log('💰 Starting daily financial summary distribution...');
    
    // Get all users with telegram configured
    const users = await transactionService.getUsersForFinancialNotification();
    
    if (users.length === 0) {
      console.log('   📝 No users with Telegram configured for financial notifications');
      return {
        success: true,
        message: 'No users to notify',
        sent: 0
      };
    }
    
    console.log(`   👥 Found ${users.length} users for daily financial summary`);
    
    const today = moment().tz('Asia/Jakarta').format('YYYY-MM-DD');
    const todayFormatted = moment().tz('Asia/Jakarta').format('DD MMMM YYYY');
    
    let sent = 0;
    let failed = 0;
    
    for (const user of users) {
      try {
        // Get daily summary for the user
        const summary = await transactionService.getDailyFinancialSummaryService(
          user.user_id,
          today
        );
        
        // Send notification via Telegram
        const result = await telegramService.sendDailyFinancialSummary(
          user.telegram_chat_id,
          user.name,
          summary,
          todayFormatted
        );
        
        if (result.success) {
          sent++;
          console.log(`   ✅ Sent daily financial summary to ${user.name}`);
        } else {
          failed++;
          console.error(`   ❌ Failed to send to ${user.name}: ${result.error}`);
        }
        
      } catch (error) {
        failed++;
        console.error(`   ❌ Error processing ${user.name}:`, error.message);
      }
    }
    
    console.log(`💰 Daily financial summary complete: ${sent} sent, ${failed} failed`);
    
    return {
      success: true,
      sent,
      failed,
      total: users.length
    };
    
  } catch (error) {
    console.error('❌ Critical error in daily financial summary:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send monthly financial summary to all users with Telegram connected
 * Runs on the 1st of every month at 08:00 - previous month summary
 */
const sendMonthlyFinancialSummaryToAllUsers = async () => {
  try {
    console.log('📊 Starting monthly financial summary distribution...');
    
    // Get all users with telegram configured
    const users = await transactionService.getUsersForFinancialNotification();
    
    if (users.length === 0) {
      console.log('   📝 No users with Telegram configured for financial notifications');
      return {
        success: true,
        message: 'No users to notify',
        sent: 0
      };
    }
    
    console.log(`   👥 Found ${users.length} users for monthly financial summary`);
    
    // Get previous month
    const now = moment().tz('Asia/Jakarta');
    const lastMonth = now.clone().subtract(1, 'month');
    const year = lastMonth.year();
    const month = lastMonth.month() + 1; // moment months are 0-indexed
    const monthYear = lastMonth.format('MMMM YYYY');
    
    let sent = 0;
    let failed = 0;
    
    for (const user of users) {
      try {
        // Get monthly summary for the user
        const summary = await transactionService.getMonthlyFinancialSummaryService(
          user.user_id,
          year,
          month
        );
        
        // Send notification via Telegram
        const result = await telegramService.sendMonthlyFinancialSummary(
          user.telegram_chat_id,
          user.name,
          summary,
          monthYear
        );
        
        if (result.success) {
          sent++;
          console.log(`   ✅ Sent monthly financial summary to ${user.name}`);
        } else {
          failed++;
          console.error(`   ❌ Failed to send to ${user.name}: ${result.error}`);
        }
        
      } catch (error) {
        failed++;
        console.error(`   ❌ Error processing ${user.name}:`, error.message);
      }
    }
    
    console.log(`📊 Monthly financial summary complete: ${sent} sent, ${failed} failed`);
    
    return {
      success: true,
      sent,
      failed,
      total: users.length
    };
    
  } catch (error) {
    console.error('❌ Critical error in monthly financial summary:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Start financial summary scheduler
 * - Daily summary: Every day at 21:00 (9 PM)
 * - Monthly summary: Every 1st of the month at 08:00
 */
export const startFinancialSummaryScheduler = () => {
  // Daily financial summary at 9 PM every day
  const dailyFinancialSummary = cron.schedule('0 21 * * *', async () => {
    try {
      await sendDailyFinancialSummaryToAllUsers();
    } catch (error) {
      console.error('❌ Daily financial summary scheduler error:', error);
    }
  }, {
    scheduled: false,
    timezone: "Asia/Jakarta"
  });
  
  // Monthly financial summary at 8 AM on the 1st of every month
  const monthlyFinancialSummary = cron.schedule('0 8 1 * *', async () => {
    try {
      await sendMonthlyFinancialSummaryToAllUsers();
    } catch (error) {
      console.error('❌ Monthly financial summary scheduler error:', error);
    }
  }, {
    scheduled: false,
    timezone: "Asia/Jakarta"
  });
  
  // Start the scheduled tasks
  dailyFinancialSummary.start();
  monthlyFinancialSummary.start();
  
  scheduledTasks.push(
    { name: 'daily-financial-summary', task: dailyFinancialSummary, cron: '0 21 * * *' },
    { name: 'monthly-financial-summary', task: monthlyFinancialSummary, cron: '0 8 1 * *' }
  );
  
  console.log('💰 Financial summary scheduler started:');
  console.log('   📅 Daily summary at 21:00 (9 PM)');
  console.log('   🗓️ Monthly summary at 08:00 on 1st of each month');
  console.log('   🌏 Timezone: Asia/Jakarta');
};

// Manual trigger for testing daily financial summary
export const triggerDailyFinancialSummary = async () => {
  console.log('🔧 Manual trigger: Daily financial summary');
  return await sendDailyFinancialSummaryToAllUsers();
};

// Manual trigger for testing monthly financial summary
export const triggerMonthlyFinancialSummary = async () => {
  console.log('🔧 Manual trigger: Monthly financial summary');
  return await sendMonthlyFinancialSummaryToAllUsers();
};

// Start smart reminder scheduler
export const startReminderScheduler = () => {
  // Process pending reminders every minute
  const reminderProcessor = cron.schedule('* * * * *', async () => {
    try {
      await reminderService.processPendingReminders();
    } catch (error) {
      console.error('❌ Reminder processing error:', error);
    }
  }, {
    scheduled: false,
    timezone: "Asia/Jakarta"
  });
  
  // Check overdue tasks every 6 hours
  const overdueChecker = cron.schedule('0 */6 * * *', async () => {
    try {
      await reminderService.checkOverdueTasks();
    } catch (error) {
      console.error('❌ Overdue check error:', error);
    }
  }, {
    scheduled: false,
    timezone: "Asia/Jakarta"
  });
  
  // Send daily summaries at multiple times based on user preferences
  // Check every 15 minutes if anyone needs summary at this time
  const dailySummary = cron.schedule('*/15 * * * *', async () => {
    try {
      await reminderService.sendDailySummaries();
    } catch (error) {
      console.error('❌ Daily summary error:', error);
    }
  }, {
    scheduled: false,
    timezone: "Asia/Jakarta"
  });
  
  reminderProcessor.start();
  overdueChecker.start();
  dailySummary.start();
  
  scheduledTasks.push(
    { name: 'reminder-processor', task: reminderProcessor, cron: '* * * * *' },
    { name: 'overdue-checker', task: overdueChecker, cron: '0 */6 * * *' },
    { name: 'daily-summary', task: dailySummary, cron: '*/15 * * * *' }
  );
  
  console.log('🔔 Smart reminder scheduler started:');
  console.log('   ⏰ Processing reminders every minute');
  console.log('   ⚠️ Checking overdue every 6 hours');
  console.log('   📊 Daily summaries every 15 minutes (user-based)');
};

// Stop daily routine scheduler
export const stopDailyRoutineScheduler = () => {
  if (!isSchedulerRunning) {
    console.log('⚠️ Daily routine scheduler is not running');
    return;
  }
  
  scheduledTasks.forEach(({ name, task }) => {
    task.stop();
    task.destroy();
    console.log(`🛑 Stopped scheduler: ${name}`);
  });
  
  scheduledTasks = [];
  isSchedulerRunning = false;
  
  console.log('🛑 Daily routine scheduler stopped');
};

// Get scheduler status
export const getSchedulerStatus = () => {
  return {
    isRunning: isSchedulerRunning,
    scheduledTasks: scheduledTasks.map(({ name, cron }) => ({ name, cron })),
    startedAt: isSchedulerRunning ? new Date().toISOString() : null
  };
};

// Manual trigger for testing (can be called via API)
export const triggerDailyGeneration = async () => {
  console.log('🔧 Manual trigger: Daily routine generation');
  return await generateDailyRoutinesForAllUsers();
};

// Schedule weekly cleanup (remove old generation records)
export const startWeeklyCleanup = () => {
  // Run every Sunday at 2:00 AM
  const weeklyCleanup = cron.schedule('0 2 * * 0', async () => {
    try {
      console.log('🧹 Starting weekly cleanup of old generation records...');
      
      const client = await pool.connect();
      
      // Delete generation records older than 90 days
      const cleanupResult = await client.query(`
        DELETE FROM daily_routine_generations 
        WHERE created_at < NOW() - INTERVAL '90 days'
      `);
      
      console.log(`🗑️ Cleaned up ${cleanupResult.rowCount} old generation records`);
      
      client.release();
    } catch (error) {
      console.error('❌ Weekly cleanup error:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Jakarta"
  });
  
  scheduledTasks.push({
    name: 'weekly-cleanup',
    task: weeklyCleanup,
    cron: '0 2 * * 0'
  });
  
  console.log('🧹 Weekly cleanup scheduler started (Sunday 2:00 AM)');
};

// Initialize scheduler (called from app.js)
export const initializeScheduler = () => {
  console.log('🔧 Initializing Scheduler System...');
  
  try {
    startDailyRoutineScheduler();
    startReminderScheduler();
    startFinancialSummaryScheduler();
    startWeeklyCleanup();
    
    console.log('✅ Scheduler System initialized successfully');
    
    // Test connection to ensure everything works
    setTimeout(async () => {
      try {
        console.log('🧪 Testing scheduler components...');
        const status = getSchedulerStatus();
        console.log('📊 Scheduler status:', status);
      } catch (error) {
        console.error('❌ Scheduler test failed:', error);
      }
    }, 2000);
    
  } catch (error) {
    console.error('❌ Failed to initialize scheduler:', error);
  }
};

// Graceful shutdown
export const shutdownScheduler = () => {
  console.log('🔄 Shutting down Scheduler System...');
  stopDailyRoutineScheduler();
  console.log('✅ Scheduler shutdown completed');
};

export default {
  startDailyRoutineScheduler,
  startReminderScheduler,
  startFinancialSummaryScheduler,
  stopDailyRoutineScheduler,
  getSchedulerStatus,
  triggerDailyGeneration,
  triggerDailyFinancialSummary,
  triggerMonthlyFinancialSummary,
  initializeScheduler,
  shutdownScheduler,
  generateDailyRoutinesForAllUsers
};