import { pool } from '../config/db.js';
import UserService from './userService.js';

/**
 * Admin Service - Business Logic Layer for Admin Operations
 * Handles all admin-related operations and system statistics
 */

class AdminService {
  /**
   * Get all users (Admin only)
   * @returns {Object} List of users
   */
  static async getAllUsers() {
    return await UserService.getAllUsers();
  }

  /**
   * Get all tasks from all users (Admin only)
   * @returns {Object} List of all tasks
   */
  static async getAllTasks() {
    try {
      const result = await pool.query(`
        SELECT t.id, t.title, t.status, t.priority, t.due_date, 
               u.name AS user_name, u.email AS user_email
        FROM tasks t
        JOIN users u ON t.user_id = u.id
        ORDER BY t.created_at DESC
      `);

      return {
        success: true,
        tasks: result.rows,
        count: result.rowCount
      };
    } catch (error) {
      console.error('Error getting all tasks:', error);
      return {
        success: false,
        error: error.message,
        tasks: []
      };
    }
  }

  /**
   * Update user role (Admin only)
   * @param {string} userId - User ID
   * @param {string} role - New role (user/admin)
   * @returns {Object} Update result
   */
  static async updateUserRole(userId, role) {
    // Validate role
    if (!['user', 'admin'].includes(role)) {
      return {
        success: false,
        error: 'Invalid role. Must be "user" or "admin"',
        user: null
      };
    }

    return await UserService.updateUserRole(userId, role);
  }

  /**
   * Delete user (Admin only)
   * @param {string} userId - User ID
   * @returns {Object} Delete result
   */
  static async deleteUser(userId) {
    return await UserService.deleteUser(userId);
  }

  /**
   * Get system statistics (Admin only)
   * @returns {Object} System statistics
   */
  static async getSystemStats() {
    try {
      const client = await pool.connect();

      // Get counts in parallel
      const [usersResult, tasksResult, routinesResult, transactionsResult] = await Promise.all([
        client.query('SELECT COUNT(*) as count FROM users'),
        client.query('SELECT COUNT(*) as count FROM tasks'),
        client.query('SELECT COUNT(*) as count FROM routine_templates'),
        client.query('SELECT COUNT(*) as count FROM transactions')
      ]);

      // Get task stats by status
      const taskStatusResult = await client.query(`
        SELECT status, COUNT(*) as count 
        FROM tasks 
        GROUP BY status
      `);

      // Get recent activity
      const recentTasksResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM tasks 
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `);

      client.release();

      return {
        success: true,
        stats: {
          totalUsers: parseInt(usersResult.rows[0].count),
          totalTasks: parseInt(tasksResult.rows[0].count),
          totalRoutines: parseInt(routinesResult.rows[0].count),
          totalTransactions: parseInt(transactionsResult.rows[0].count),
          tasksByStatus: taskStatusResult.rows.reduce((acc, row) => {
            acc[row.status] = parseInt(row.count);
            return acc;
          }, {}),
          recentTasks: parseInt(recentTasksResult.rows[0].count)
        }
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      return {
        success: false,
        error: error.message,
        stats: null
      };
    }
  }

  /**
   * Cleanup old data (Admin only)
   * Remove completed tasks older than specified days
   * @param {number} days - Number of days (default: 90)
   * @returns {Object} Cleanup result
   */
  static async cleanupOldData(days = 90) {
    try {
      const result = await pool.query(`
        DELETE FROM tasks 
        WHERE status = 'completed' 
        AND updated_at < NOW() - INTERVAL '${days} days'
        RETURNING id
      `);

      return {
        success: true,
        deletedCount: result.rowCount,
        message: `Deleted ${result.rowCount} old completed tasks`
      };
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      return {
        success: false,
        error: error.message,
        deletedCount: 0
      };
    }
  }
}

export default AdminService;
