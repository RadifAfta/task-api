-- Add user_title column to user_telegram_config table
-- This allows users to choose how they want to be addressed (Bos, Tuan, Raja, etc.)

ALTER TABLE user_telegram_config
ADD COLUMN IF NOT EXISTS user_title VARCHAR(50) DEFAULT 'My Lord';

-- Update existing users to have default title
UPDATE user_telegram_config
SET user_title = 'My Lord'
WHERE user_title IS NULL;

COMMENT ON COLUMN user_telegram_config.user_title IS 'How the user wants to be addressed by the bot (e.g., Bos, Tuan, Raja)';
