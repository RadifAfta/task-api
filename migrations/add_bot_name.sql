-- Add bot_name column to user_telegram_config table
-- This allows each user to personalize their bot's name

ALTER TABLE user_telegram_config
ADD COLUMN IF NOT EXISTS bot_name VARCHAR(50) DEFAULT 'Levi';

-- Update existing records to have default bot name
UPDATE user_telegram_config
SET bot_name = 'Levi'
WHERE bot_name IS NULL;

-- Add comment to the column
COMMENT ON COLUMN user_telegram_config.bot_name IS 'Personalized name for the user''s bot companion';