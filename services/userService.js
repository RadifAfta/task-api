import { pool } from '../config/db.js';

/**
 * User Service - Business Logic Layer for User Management
 * Handles all user-related database operations and business logic
 */

class UserService {
  /**
   * Verify user by telegram chat ID
   * @param {string} chatId - Telegram chat ID
   * @returns {Object} User verification result
   */
  static async verifyUserByChatId(chatId) {
    try {
      const client = await pool.connect();

      const result = await client.query(`
        SELECT utc.*, u.name, u.email, COALESCE(utc.bot_name, 'Levi') as bot_name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.telegram_chat_id = $1 AND utc.is_verified = true
      `, [chatId]);

      client.release();

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'User not verified',
          user: null
        };
      }

      return {
        success: true,
        user: result.rows[0]
      };
    } catch (error) {
      console.error('Error verifying user:', error);
      return {
        success: false,
        error: error.message,
        user: null
      };
    }
  }

  /**
   * Check if user is already registered
   * @param {string} chatId - Telegram chat ID
   * @returns {Object} Registration check result
   */
  static async checkExistingRegistration(chatId) {
    try {
      const client = await pool.connect();

      const result = await client.query(
        'SELECT user_id FROM user_telegram_config WHERE telegram_chat_id = $1',
        [chatId]
      );

      client.release();

      return {
        success: true,
        isRegistered: result.rows.length > 0,
        userId: result.rows.length > 0 ? result.rows[0].user_id : null
      };
    } catch (error) {
      console.error('Error checking registration:', error);
      return {
        success: false,
        error: error.message,
        isRegistered: false
      };
    }
  }

  /**
   * Check if user is already logged in
   * @param {string} chatId - Telegram chat ID
   * @returns {Object} Login check result
   */
  static async checkLoginStatus(chatId) {
    try {
      const client = await pool.connect();

      const result = await client.query(
        'SELECT user_id FROM user_telegram_config WHERE telegram_chat_id = $1 AND is_verified = true',
        [chatId]
      );

      client.release();

      return {
        success: true,
        isLoggedIn: result.rows.length > 0,
        userId: result.rows.length > 0 ? result.rows[0].user_id : null
      };
    } catch (error) {
      console.error('Error checking login status:', error);
      return {
        success: false,
        error: error.message,
        isLoggedIn: false
      };
    }
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Object} User lookup result
   */
  static async findUserByEmail(email) {
    try {
      const client = await pool.connect();

      const result = await client.query(
        'SELECT id, email, name, password_hash FROM users WHERE email = $1',
        [email]
      );

      client.release();

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'User not found',
          user: null
        };
      }

      return {
        success: true,
        user: result.rows[0]
      };
    } catch (error) {
      console.error('Error finding user by email:', error);
      return {
        success: false,
        error: error.message,
        user: null
      };
    }
  }

  /**
   * Verify user with verification code
   * @param {string} verificationCode - Verification code
   * @returns {Object} Verification result
   */
  static async verifyUserWithCode(verificationCode) {
    try {
      const client = await pool.connect();

      const result = await client.query(`
        SELECT utc.*, u.email, u.name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        WHERE utc.verification_code = $1
        AND utc.is_verified = false
        AND utc.verification_expires_at > NOW()
      `, [verificationCode]);

      client.release();

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Invalid or expired verification code',
          userConfig: null
        };
      }

      return {
        success: true,
        userConfig: result.rows[0]
      };
    } catch (error) {
      console.error('Error verifying user with code:', error);
      return {
        success: false,
        error: error.message,
        userConfig: null
      };
    }
  }

  /**
   * Update user verification status
   * @param {string} userId - User ID
   * @param {string} chatId - Telegram chat ID
   * @param {string} username - Telegram username
   * @returns {Object} Update result
   */
  static async updateUserVerification(userId, chatId, username) {
    try {
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
      `, [chatId, username, userId]);

      client.release();

      return {
        success: true
      };
    } catch (error) {
      console.error('Error updating user verification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user status and settings
   * @param {string} chatId - Telegram chat ID
   * @returns {Object} User status result
   */
  static async getUserStatus(chatId) {
    try {
      const client = await pool.connect();

      const result = await client.query(`
        SELECT utc.*, u.name, u.email, rs.*, COALESCE(utc.bot_name, 'Levi') as bot_name
        FROM user_telegram_config utc
        JOIN users u ON utc.user_id = u.id
        LEFT JOIN reminder_settings rs ON utc.user_id = rs.user_id
        WHERE utc.telegram_chat_id = $1
      `, [chatId]);

      client.release();

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'User not found',
          config: null
        };
      }

      return {
        success: true,
        config: result.rows[0]
      };
    } catch (error) {
      console.error('Error getting user status:', error);
      return {
        success: false,
        error: error.message,
        config: null
      };
    }
  }

  /**
   * Logout user (disconnect telegram)
   * @param {string} userId - User ID
   * @returns {Object} Logout result
   */
  static async logoutUser(userId) {
    try {
      const client = await pool.connect();

      await client.query(`
        UPDATE user_telegram_config
        SET telegram_chat_id = NULL,
            telegram_username = NULL,
            is_verified = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
      `, [userId]);

      client.release();

      return {
        success: true
      };
    } catch (error) {
      console.error('Error logging out user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create new user account
   * @param {Object} userData - User data
   * @param {string} userData.name - User name
   * @param {string} userData.email - User email
   * @param {string} userData.passwordHash - Password hash
   * @returns {Object} User creation result
   */
  static async createUser(userData) {
    try {
      const { v4: uuidv4 } = await import('uuid');
      const userId = uuidv4();

      const client = await pool.connect();

      const result = await client.query(`
        INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, name, email
      `, [userId, userData.name, userData.email, userData.passwordHash]);

      client.release();

      return {
        success: true,
        user: result.rows[0]
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: error.message,
        user: null
      };
    }
  }
}

export default UserService;