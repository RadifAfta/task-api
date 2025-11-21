-- Clear all data from database tables
-- This will delete all rows from all tables

-- Disable foreign key checks temporarily (PostgreSQL doesn't have this, but CASCADE will handle)
-- TRUNCATE with CASCADE will delete all dependent data

TRUNCATE TABLE routine_generated_tasks CASCADE;
TRUNCATE TABLE daily_routine_generations CASCADE;
TRUNCATE TABLE routine_template_tasks CASCADE;
TRUNCATE TABLE routine_templates CASCADE;
TRUNCATE TABLE scheduled_reminders CASCADE;
TRUNCATE TABLE notification_logs CASCADE;
TRUNCATE TABLE reminder_settings CASCADE;
TRUNCATE TABLE user_telegram_config CASCADE;
TRUNCATE TABLE tasks CASCADE;
TRUNCATE TABLE users CASCADE;

-- Reset sequences if any (but since using UUID, probably not needed)

-- Confirm all tables are empty
SELECT
    'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'user_telegram_config', COUNT(*) FROM user_telegram_config
UNION ALL
SELECT 'reminder_settings', COUNT(*) FROM reminder_settings
UNION ALL
SELECT 'notification_logs', COUNT(*) FROM notification_logs
UNION ALL
SELECT 'scheduled_reminders', COUNT(*) FROM scheduled_reminders
UNION ALL
SELECT 'routine_templates', COUNT(*) FROM routine_templates
UNION ALL
SELECT 'routine_template_tasks', COUNT(*) FROM routine_template_tasks
UNION ALL
SELECT 'daily_routine_generations', COUNT(*) FROM daily_routine_generations
UNION ALL
SELECT 'routine_generated_tasks', COUNT(*) FROM routine_generated_tasks;