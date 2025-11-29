import { pool } from '../config/db.js';
import {
  createTask as createTaskModel,
  getTasksByUser as getTasksByUserModel,
  getTaskById as getTaskByIdModel,
  updateTask as updateTaskModel,
  deleteTask as deleteTaskModel
} from '../models/taskModel.js';

/**
 * Task Service - Business Logic Layer for Task Management
 * Handles all task-related database operations and business logic
 */

class TaskService {
  /**
   * Create a new task
   * @param {string} userId - User ID
   * @param {Object} taskData - Task data
   * @param {string} taskData.title - Task title
   * @param {string} taskData.description - Task description
   * @param {string} taskData.priority - Task priority (high/medium/low)
   * @param {string} taskData.category - Task category (work/learn/rest)
   * @param {string} taskData.time_start - Start time (HH:MM)
   * @param {string} taskData.time_end - End time (HH:MM)
   * @returns {Object} Created task
   */
  static async createTask(userId, taskData) {
    try {
      // Use model to create task
      const task = await createTaskModel(
        userId,
        taskData.title,
        taskData.description || '',
        'pending',
        taskData.priority || 'medium',
        taskData.category || 'work',
        null, // dueDate
        taskData.time_start,
        taskData.time_end
      );

      // Schedule reminders
      try {
        const reminderService = await import('../services/reminderService.js');
        await reminderService.scheduleRemindersForTask({
          ...task,
          time_start: taskData.time_start
        });
        console.log(`⏰ Reminders scheduled for task ${task.id}`);
      } catch (reminderError) {
        console.error('⚠️ Failed to schedule reminders:', reminderError);
      }

      return {
        success: true,
        task: task
      };

    } catch (error) {
      console.error('Error creating task:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get a single task by ID
   * @param {string} userId - User ID
   * @param {string} taskId - Task ID
   * @returns {Object} Task result
   */
  static async getTaskById(userId, taskId) {
    try {
      // Use model to get task
      const task = await getTaskByIdModel(taskId, userId);

      if (!task) {
        return {
          success: false,
          error: 'Task not found or access denied'
        };
      }

      return {
        success: true,
        task: task
      };

    } catch (error) {
      console.error('Error getting task by ID:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user tasks
   * @param {string} userId - User ID
   * @param {Object} filters - Optional filters
   * @returns {Array} User tasks
   */
  static async getUserTasks(userId, filters = {}) {
    try {
      // Convert service filters to model options
      const options = {
        status: filters.status,
        category: filters.category,
        search: filters.search,
        limit: filters.limit,
        offset: filters.offset
      };

      // Handle status not equal filter
      if (filters.status && typeof filters.status === 'object' && filters.status.$ne) {
        // For now, we'll handle this in service layer since model doesn't support complex filters
        const client = await pool.connect();

        let query = 'SELECT * FROM tasks WHERE user_id = $1';
        let params = [userId];
        let paramIndex = 2;

        // Add status not equal filter
        query += ` AND status != $${paramIndex}`;
        params.push(filters.status.$ne);
        paramIndex++;

        if (filters.category) {
          query += ` AND category = $${paramIndex}`;
          params.push(filters.category);
          paramIndex++;
        }

        if (filters.priority) {
          query += ` AND priority = $${paramIndex}`;
          params.push(filters.priority);
          paramIndex++;
        }

        // Handle sorting
        if (filters.sort && Array.isArray(filters.sort)) {
          const sortClauses = filters.sort.map(sortItem => {
            if (sortItem.customOrder) {
              // Handle custom ordering for priority
              return `CASE ${sortItem.field}
                ${sortItem.customOrder.map((val, idx) => `WHEN '${val}' THEN ${idx}`).join(' ')}
                END ${sortItem.order.toUpperCase()}`;
            } else {
              return `${sortItem.field} ${sortItem.order.toUpperCase()}`;
            }
          });
          query += ` ORDER BY ${sortClauses.join(', ')}`;
        } else {
          query += ' ORDER BY created_at DESC';
        }

        // Handle limit
        if (filters.limit) {
          query += ` LIMIT $${paramIndex}`;
          params.push(filters.limit);
          paramIndex++;
        }

        const result = await client.query(query, params);
        client.release();

        return {
          success: true,
          tasks: result.rows
        };
      }

      // Use model for simple filters
      const result = await getTasksByUserModel(userId, options);

      return {
        success: true,
        tasks: result.tasks
      };

    } catch (error) {
      console.error('Error getting user tasks:', error);
      return {
        success: false,
        error: error.message,
        tasks: []
      };
    }
  }

  /**
   * Get today's tasks for a user (complex filter for /today command)
   * @param {string} userId - User ID
   * @param {string} todayStr - Today's date string (YYYY-MM-DD)
   * @returns {Array} Today's tasks
   */
  static async getTodayTasks(userId, todayStr) {
    try {
      const client = await pool.connect();

      const result = await client.query(`
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
      `, [userId, todayStr]);

      client.release();

      return {
        success: true,
        tasks: result.rows
      };

    } catch (error) {
      console.error('Error getting today tasks:', error);
      return {
        success: false,
        error: error.message,
        tasks: []
      };
    }
  }

  /**
   * Update task
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated task
   */
  static async updateTask(taskId, userId, updateData) {
    try {
      // Map updateData to model fields
      const fields = {
        title: updateData.title,
        description: updateData.description,
        status: updateData.status,
        priority: updateData.priority,
        category: updateData.category,
        due_date: updateData.due_date,
        time_start: updateData.time_start,
        time_end: updateData.time_end
      };

      const updatedTask = await updateTaskModel(taskId, userId, fields);

      if (!updatedTask) {
        return {
          success: false,
          error: 'Task not found or access denied'
        };
      }

      // Reschedule reminders if time changed and status is not done
      if (updateData.time_start && updatedTask.status !== 'done') {
        try {
          const reminderService = await import('../services/reminderService.js');
          // Delete old reminders - this might need to be moved to model or kept here
          const client = await pool.connect();
          await client.query(`
            DELETE FROM scheduled_reminders WHERE task_id = $1 AND status = 'pending'
          `, [taskId]);
          client.release();

          // Schedule new reminders
          await reminderService.scheduleRemindersForTask({
            ...updatedTask,
            time_start: updateData.time_start
          });
          console.log(`⏰ Reminders rescheduled for task ${taskId}`);
        } catch (reminderError) {
          console.error('⚠️ Failed to reschedule reminders:', reminderError);
        }
      }

      return {
        success: true,
        task: updatedTask
      };

    } catch (error) {
      console.error('Error updating task:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mark task as complete
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @returns {Object} Updated task
   */
  static async completeTask(taskId, userId) {
    try {
      // Use model to update task status to done
      const updatedTask = await updateTaskModel(taskId, userId, { status: 'done' });

      if (!updatedTask) {
        return {
          success: false,
          error: 'Task not found or access denied'
        };
      }

      return {
        success: true,
        task: updatedTask
      };

    } catch (error) {
      console.error('Error completing task:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete task
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @returns {Object} Deletion result
   */
  static async deleteTask(taskId, userId) {
    try {
      const client = await pool.connect();

      // Delete associated reminders first
      await client.query(`
        DELETE FROM scheduled_reminders WHERE task_id = $1
      `, [taskId]);

      // Delete task using model
      const deletedTask = await deleteTaskModel(taskId, userId);

      client.release();

      if (!deletedTask) {
        return {
          success: false,
          error: 'Task not found or access denied'
        };
      }

      return {
        success: true,
        task: deletedTask
      };

    } catch (error) {
      console.error('Error deleting task:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get task counts for a user
   * @param {string} userId - User ID
   * @returns {Object} Task counts
   */
  static async getTaskCounts(userId) {
    try {
      const client = await pool.connect();

      const result = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'done' AND DATE(updated_at) = CURRENT_DATE) as done_today
        FROM tasks
        WHERE user_id = $1
      `, [userId]);

      client.release();

      return {
        success: true,
        counts: result.rows[0]
      };

    } catch (error) {
      console.error('Error getting task counts:', error);
      return {
        success: false,
        error: error.message,
        counts: { pending: 0, in_progress: 0, done_today: 0 }
      };
    }
  }
  static parseTaskInput(input) {
    try {
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

      return {
        success: true,
        data: {
          title,
          description,
          priority: finalPriority,
          category: finalCategory,
          time_start: finalTimeStart,
          time_end: finalTimeEnd
        }
      };

    } catch (error) {
      console.error('Error parsing task input:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate task data
   * @param {Object} taskData - Task data to validate
   * @returns {Object} Validation result
   */
  static validateTaskData(taskData) {
    const errors = [];

    if (!taskData.title || taskData.title.trim() === '') {
      errors.push('Title is required');
    }

    if (!taskData.time_start) {
      errors.push('Start time is required for reminders');
    }

    const validPriorities = ['high', 'medium', 'low'];
    if (!validPriorities.includes(taskData.priority)) {
      errors.push('Invalid priority. Must be high, medium, or low');
    }

    const validCategories = ['work', 'learn', 'rest'];
    if (!validCategories.includes(taskData.category)) {
      errors.push('Invalid category. Must be work, learn, or rest');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default TaskService;