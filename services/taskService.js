import { pool } from '../config/db.js';

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
      const client = await pool.connect();

      const result = await client.query(`
        SELECT * FROM tasks
        WHERE id = $1 AND user_id = $2
      `, [taskId, userId]);

      client.release();

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Task not found or access denied'
        };
      }

      return {
        success: true,
        task: result.rows[0]
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
      const client = await pool.connect();

      let query = 'SELECT * FROM tasks WHERE user_id = $1';
      let params = [userId];
      let paramIndex = 2;

      // Add filters
      if (filters.status && typeof filters.status === 'string') {
        query += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      // Handle status not equal filter
      if (filters.status && typeof filters.status === 'object' && filters.status.$ne) {
        query += ` AND status != $${paramIndex}`;
        params.push(filters.status.$ne);
        paramIndex++;
      }

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
      const client = await pool.connect();

      // Build dynamic update query
      const fields = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(updateData[key]);
          paramIndex++;
        }
      });

      if (fields.length === 0) {
        client.release();
        return {
          success: false,
          error: 'No fields to update'
        };
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');

      const query = `
        UPDATE tasks
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      values.push(taskId, userId);

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        client.release();
        return {
          success: false,
          error: 'Task not found or access denied'
        };
      }

      const updatedTask = result.rows[0];

      // Reschedule reminders if time changed and status is not done
      if (updateData.time_start && updatedTask.status !== 'done') {
        try {
          const reminderService = await import('../services/reminderService.js');
          // Delete old reminders
          await client.query(`
            DELETE FROM scheduled_reminders WHERE task_id = $1 AND status = 'pending'
          `, [taskId]);

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

      client.release();

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
      const client = await pool.connect();

      const result = await client.query(`
        UPDATE tasks
        SET status = 'done', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [taskId, userId]);

      client.release();

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Task not found or access denied'
        };
      }

      return {
        success: true,
        task: result.rows[0]
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

      // Delete task
      const result = await client.query(`
        DELETE FROM tasks WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [taskId, userId]);

      client.release();

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Task not found or access denied'
        };
      }

      return {
        success: true,
        task: result.rows[0]
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