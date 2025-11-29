import { pool } from '../config/db.js';
import { updateTask as updateTaskModel } from '../models/taskModel.js';
import { updateRoutineTemplate } from '../models/routineModel.js';

/**
 * Field Service - Business Logic Layer for Field Editing Operations
 * Handles field updates for tasks and routines
 */

class FieldService {
  /**
   * Update task field
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @param {string} field - Field name
   * @param {any} value - New value
   * @returns {Object} Update result
   */
  static async updateTaskField(taskId, userId, field, value) {
    try {
      // Validate field name
      const allowedFields = ['title', 'description', 'priority', 'category', 'time_start', 'time_end', 'status'];
      if (!allowedFields.includes(field)) {
        return {
          success: false,
          error: `Invalid field: ${field}`
        };
      }

      // Map field to model field name
      const fieldMapping = {
        'time_start': 'time_start',
        'time_end': 'time_end',
        'due_date': 'due_date'
      };

      const modelField = fieldMapping[field] || field;

      // Create update object for model
      const updateData = {};
      updateData[modelField] = value;

      // Use model to update task
      const updatedTask = await updateTaskModel(taskId, userId, updateData);

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
      console.error('Error updating task field:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update routine template field
   * @param {string} routineId - Routine template ID
   * @param {string} userId - User ID
   * @param {string} field - Field name
   * @param {any} value - New value
   * @returns {Object} Update result
   */
  static async updateRoutineField(routineId, userId, field, value) {
    try {
      // Validate field name
      const allowedFields = ['name', 'description', 'is_active'];
      if (!allowedFields.includes(field)) {
        return {
          success: false,
          error: `Invalid field: ${field}`
        };
      }

      // Map field to model field name
      const fieldMapping = {
        'is_active': 'isActive'
      };

      const modelField = fieldMapping[field] || field;

      // Create update object for model
      const updateData = {};
      updateData[modelField] = value;

      // Use model to update routine template
      const updatedRoutine = await updateRoutineTemplate(routineId, userId, updateData);

      if (!updatedRoutine) {
        return {
          success: false,
          error: 'Routine template not found or access denied'
        };
      }

      return {
        success: true,
        routine: updatedRoutine
      };
    } catch (error) {
      console.error('Error updating routine field:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Complete task
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @returns {Object} Completion result
   */
  static async completeTask(taskId, userId) {
    return this.updateTaskField(taskId, userId, 'status', 'done');
  }

  /**
   * Update task status
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @param {string} status - New status
   * @returns {Object} Update result
   */
  static async updateTaskStatus(taskId, userId, status) {
    const validStatuses = ['pending', 'in_progress', 'done'];
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        error: `Invalid status: ${status}`
      };
    }

    return this.updateTaskField(taskId, userId, 'status', status);
  }

  /**
   * Update task priority
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @param {string} priority - New priority
   * @returns {Object} Update result
   */
  static async updateTaskPriority(taskId, userId, priority) {
    const validPriorities = ['high', 'medium', 'low'];
    if (!validPriorities.includes(priority)) {
      return {
        success: false,
        error: `Invalid priority: ${priority}`
      };
    }

    return this.updateTaskField(taskId, userId, 'priority', priority);
  }

  /**
   * Update task category
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @param {string} category - New category
   * @returns {Object} Update result
   */
  static async updateTaskCategory(taskId, userId, category) {
    const validCategories = ['work', 'learn', 'rest'];
    if (!validCategories.includes(category)) {
      return {
        success: false,
        error: `Invalid category: ${category}`
      };
    }

    return this.updateTaskField(taskId, userId, 'category', category);
  }

  /**
   * Update task title
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @param {string} title - New title
   * @returns {Object} Update result
   */
  static async updateTaskTitle(taskId, userId, title) {
    if (!title || title.trim().length === 0) {
      return {
        success: false,
        error: 'Title cannot be empty'
      };
    }

    return this.updateTaskField(taskId, userId, 'title', title.trim());
  }

  /**
   * Update task description
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @param {string} description - New description
   * @returns {Object} Update result
   */
  static async updateTaskDescription(taskId, userId, description) {
    return this.updateTaskField(taskId, userId, 'description', description || '');
  }

  /**
   * Update task time
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @param {string} timeStart - Start time (HH:MM)
   * @param {string} timeEnd - End time (HH:MM)
   * @returns {Object} Update result
   */
  static async updateTaskTime(taskId, userId, timeStart, timeEnd) {
    try {
      // Use model to update task time fields
      const updateData = {
        time_start: timeStart,
        time_end: timeEnd
      };

      const updatedTask = await updateTaskModel(taskId, userId, updateData);

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
      console.error('Error updating task time:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update routine name
   * @param {string} routineId - Routine template ID
   * @param {string} userId - User ID
   * @param {string} name - New name
   * @returns {Object} Update result
   */
  static async updateRoutineName(routineId, userId, name) {
    if (!name || name.trim().length === 0) {
      return {
        success: false,
        error: 'Name cannot be empty'
      };
    }

    return this.updateRoutineField(routineId, userId, 'name', name.trim());
  }

  /**
   * Update routine description
   * @param {string} routineId - Routine template ID
   * @param {string} userId - User ID
   * @param {string} description - New description
   * @returns {Object} Update result
   */
  static async updateRoutineDescription(routineId, userId, description) {
    return this.updateRoutineField(routineId, userId, 'description', description || '');
  }

  /**
   * Toggle routine active status
   * @param {string} routineId - Routine template ID
   * @param {string} userId - User ID
   * @param {boolean} isActive - Active status
   * @returns {Object} Update result
   */
  static async toggleRoutineActive(routineId, userId, isActive) {
    return this.updateRoutineField(routineId, userId, 'is_active', isActive);
  }
}

export default FieldService;