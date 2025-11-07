import cron from 'node-cron';
import * as routineService from '../services/routineService.js';
import * as routineModel from '../models/routineModel.js';
import { pool } from '../config/db.js';

/**
 * Daily Routine Scheduler
 * Automatically generates daily tasks from routine templates
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
  console.log('🔧 Initializing Daily Routine Scheduler...');
  
  try {
    startDailyRoutineScheduler();
    startWeeklyCleanup();
    
    console.log('✅ Daily Routine Scheduler initialized successfully');
    
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
  console.log('🔄 Shutting down Daily Routine Scheduler...');
  stopDailyRoutineScheduler();
  console.log('✅ Scheduler shutdown completed');
};

export default {
  startDailyRoutineScheduler,
  stopDailyRoutineScheduler,
  getSchedulerStatus,
  triggerDailyGeneration,
  initializeScheduler,
  shutdownScheduler,
  generateDailyRoutinesForAllUsers
};