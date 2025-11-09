-- Migration: Add Smart Reminder System with Telegram Integration
-- Run this SQL to add reminder and telegram notification tables

-- Create function for updated_at trigger (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table untuk Telegram configuration per user
CREATE TABLE IF NOT EXISTS user_telegram_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    telegram_chat_id BIGINT UNIQUE,
    telegram_username VARCHAR(100),
    is_verified BOOLEAN DEFAULT false,
    verification_code VARCHAR(10),
    verification_expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table untuk Reminder settings per user
CREATE TABLE IF NOT EXISTS reminder_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Reminder timing preferences
    reminder_before_minutes INTEGER[] DEFAULT ARRAY[15, 30, 60], -- Minutes before task start
    daily_summary_time TIME DEFAULT '08:00:00', -- Time for daily task summary
    enable_task_start_reminder BOOLEAN DEFAULT true,
    enable_task_due_reminder BOOLEAN DEFAULT true,
    enable_daily_summary BOOLEAN DEFAULT true,
    enable_routine_generation_notice BOOLEAN DEFAULT true,
    
    -- Notification preferences
    notify_pending_tasks BOOLEAN DEFAULT true,
    notify_overdue_tasks BOOLEAN DEFAULT true,
    notify_completed_milestone BOOLEAN DEFAULT false,
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '07:00:00',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table untuk Notification logs/history
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    
    notification_type VARCHAR(50) NOT NULL, -- 'task_start', 'task_due', 'daily_summary', 'routine_generated', 'overdue'
    notification_channel VARCHAR(20) DEFAULT 'telegram', -- 'telegram', 'email', 'push'
    
    message_title VARCHAR(255),
    message_body TEXT,
    
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    delivery_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'skipped'
    failure_reason TEXT,
    
    telegram_message_id BIGINT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table untuk Scheduled reminders (upcoming notifications)
CREATE TABLE IF NOT EXISTS scheduled_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    
    reminder_type VARCHAR(50) NOT NULL, -- 'task_start', 'task_due'
    reminder_time TIMESTAMP NOT NULL,
    minutes_before INTEGER,
    
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate reminders
    UNIQUE(user_id, task_id, reminder_type, reminder_time)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_telegram_config_user_id ON user_telegram_config(user_id);
CREATE INDEX IF NOT EXISTS idx_user_telegram_config_chat_id ON user_telegram_config(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_user_telegram_config_active ON user_telegram_config(user_id, is_active, is_verified);

CREATE INDEX IF NOT EXISTS idx_reminder_settings_user_id ON reminder_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_task_id ON notification_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(delivery_status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_user_id ON scheduled_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_task_id ON scheduled_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_time ON scheduled_reminders(reminder_time, is_sent);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_pending ON scheduled_reminders(is_sent, reminder_time);

-- Triggers for updated_at
CREATE TRIGGER update_user_telegram_config_updated_at 
    BEFORE UPDATE ON user_telegram_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_settings_updated_at 
    BEFORE UPDATE ON reminder_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create default reminder settings when user is created
CREATE OR REPLACE FUNCTION create_default_reminder_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO reminder_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create reminder settings for new users
CREATE TRIGGER auto_create_reminder_settings
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_reminder_settings();

-- Function to clean old notification logs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM notification_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Function to clean sent scheduled reminders
CREATE OR REPLACE FUNCTION cleanup_sent_reminders()
RETURNS void AS $$
BEGIN
    DELETE FROM scheduled_reminders
    WHERE is_sent = true
    AND sent_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;