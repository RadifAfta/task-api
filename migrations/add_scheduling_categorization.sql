-- Migration: Add task scheduling and categorization features
-- Run this SQL to add new columns to existing tasks table

-- Add new columns for task scheduling and categorization
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'work' CHECK (category IN ('work', 'learn', 'rest'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_start TIME;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_end TIME;

-- Add constraint to ensure time_end is after time_start (if both are provided)
ALTER TABLE tasks ADD CONSTRAINT check_time_order 
    CHECK (time_start IS NULL OR time_end IS NULL OR time_start < time_end);

-- Add index for better query performance on category
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_time_start ON tasks(time_start);
CREATE INDEX IF NOT EXISTS idx_tasks_category_status ON tasks(category, status);

-- Update existing records to have default category if needed
UPDATE tasks SET category = 'work' WHERE category IS NULL;