import { telegramResponse } from '../utils/response.js';
import UserService from '../services/userService.js';
import TaskService from '../services/taskService.js';
import RoutineService from '../services/routineService.js';

/**
 * Telegram Controller
 * Handles business logic for Telegram bot commands
 * Separated from presentation logic (telegramView.js)
 */

export class TelegramController {
  /**
   * Handle /myroutines command
   */
  static async handleMyRoutines(chatId) {
    try {
      // Verify user
      const userResult = await UserService.verifyUserByChatId(chatId);
      if (!userResult.success) {
        return telegramResponse(false, null, 'User not verified');
      }

      const user = userResult.user;

      // Get routine templates
      const routinesResult = await RoutineService.getRoutineTemplatesByUser(user.user_id);
      if (!routinesResult.success) {
        return telegramResponse(false, null, routinesResult.error || 'Failed to fetch routines');
      }

      return telegramResponse(true, {
        user: user,
        routines: routinesResult.routines
      });

    } catch (error) {
      console.error('Error in handleMyRoutines:', error);
      return telegramResponse(false, null, 'Internal server error');
    }
  }

  /**
   * Handle /today command
   */
  static async handleTodayTasks(chatId) {
    try {
      // Verify user
      const userResult = await UserService.verifyUserByChatId(chatId);
      if (!userResult.success) {
        return telegramResponse(false, null, 'User not verified');
      }

      const user = userResult.user;

      // Get today's tasks
      const today = new Date().toISOString().split('T')[0];
      const tasksResult = await TaskService.getTodayTasks(user.user_id, today);

      if (!tasksResult.success) {
        return telegramResponse(false, null, tasksResult.error || 'Failed to fetch tasks');
      }

      return telegramResponse(true, {
        user: user,
        tasks: tasksResult.tasks,
        date: today
      });

    } catch (error) {
      console.error('Error in handleTodayTasks:', error);
      return telegramResponse(false, null, 'Internal server error');
    }
  }

  /**
   * Handle /mytasks command
   */
  static async handleMyTasks(chatId) {
    try {
      // Verify user
      const userResult = await UserService.verifyUserByChatId(chatId);
      if (!userResult.success) {
        return telegramResponse(false, null, 'User not verified');
      }

      const user = userResult.user;

      // Get active tasks
      const tasksResult = await TaskService.getUserTasks(user.user_id, {
        status: { $ne: 'done' },
        sort: [
          { field: 'priority', order: 'asc', customOrder: ['high', 'medium', 'low'] },
          { field: 'time_start', order: 'asc' },
          { field: 'created_at', order: 'desc' }
        ],
        limit: 15
      });

      if (!tasksResult.success) {
        return telegramResponse(false, null, tasksResult.error || 'Failed to fetch tasks');
      }

      return telegramResponse(true, {
        user: user,
        tasks: tasksResult.tasks
      });

    } catch (error) {
      console.error('Error in handleMyTasks:', error);
      return telegramResponse(false, null, 'Internal server error');
    }
  }

  /**
   * Handle task completion
   */
  static async handleCompleteTask(chatId, taskId) {
    try {
      // Verify user
      const userResult = await UserService.verifyUserByChatId(chatId);
      if (!userResult.success) {
        return telegramResponse(false, null, 'User not verified');
      }

      const user = userResult.user;

      // Complete task
      const completeResult = await TaskService.completeTask(taskId, user.user_id);
      if (!completeResult.success) {
        return telegramResponse(false, null, 'Task not found or already completed');
      }

      return telegramResponse(true, {
        task: completeResult.task
      });

    } catch (error) {
      console.error('Error in handleCompleteTask:', error);
      return telegramResponse(false, null, 'Internal server error');
    }
  }

  /**
   * Handle routine generation
   */
  static async handleGenerateRoutine(chatId, routineId) {
    try {
      // Verify user
      const userResult = await UserService.verifyUserByChatId(chatId);
      if (!userResult.success) {
        return telegramResponse(false, null, 'User not verified');
      }

      const user = userResult.user;

      // Generate routine
      const generationResult = await RoutineService.generateDailyTasksFromTemplate(user.user_id, routineId);

      return telegramResponse(generationResult.success, generationResult, generationResult.message);

    } catch (error) {
      console.error('Error in handleGenerateRoutine:', error);
      return telegramResponse(false, null, 'Internal server error');
    }
  }

  /**
   * Handle user verification
   */
  static async handleVerification(verificationCode, chatId, username) {
    try {
      const verificationResult = await UserService.verifyUserWithCode(verificationCode);

      if (!verificationResult.success) {
        return telegramResponse(false, null, 'Invalid verification code');
      }

      const updateResult = await UserService.updateUserVerification(
        verificationResult.userConfig.user_id,
        chatId,
        username
      );

      if (!updateResult.success) {
        return telegramResponse(false, null, 'Verification update failed');
      }

      return telegramResponse(true, {
        userConfig: verificationResult.userConfig
      });

    } catch (error) {
      console.error('Error in handleVerification:', error);
      return telegramResponse(false, null, 'Verification failed');
    }
  }

  /**
   * Handle user login
   */
  static async handleLogin(chatId, email, password) {
    try {
      const loginResult = await UserService.authenticateUser(email, password);

      if (!loginResult.success) {
        return telegramResponse(false, null, loginResult.error);
      }

      const updateResult = await UserService.updateUserTelegramConfig(
        loginResult.user.id,
        chatId,
        null, // username will be updated later
        true // is_active
      );

      if (!updateResult.success) {
        return telegramResponse(false, null, 'Login update failed');
      }

      return telegramResponse(true, {
        user: loginResult.user,
        config: updateResult.config
      });

    } catch (error) {
      console.error('Error in handleLogin:', error);
      return telegramResponse(false, null, 'Login failed');
    }
  }

  /**
   * Handle user logout
   */
  static async handleLogout(chatId) {
    try {
      const userResult = await UserService.verifyUserByChatId(chatId);
      if (!userResult.success) {
        return telegramResponse(false, null, 'User not connected');
      }

      const logoutResult = await UserService.logoutUser(chatId);
      if (!logoutResult.success) {
        return telegramResponse(false, null, 'Logout failed');
      }

      return telegramResponse(true, {
        user: userResult.user
      });

    } catch (error) {
      console.error('Error in handleLogout:', error);
      return telegramResponse(false, null, 'Logout failed');
    }
  }

  /**
   * Handle user status check
   */
  static async handleStatus(chatId) {
    try {
      const statusResult = await UserService.getUserStatus(chatId);

      if (!statusResult.success) {
        return telegramResponse(false, null, 'User not connected');
      }

      return telegramResponse(true, {
        config: statusResult.config
      });

    } catch (error) {
      console.error('Error in handleStatus:', error);
      return telegramResponse(false, null, 'Status check failed');
    }
  }
}

export default TelegramController;