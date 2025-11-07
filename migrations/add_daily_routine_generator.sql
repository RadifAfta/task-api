-- Migration: Add Daily Routine Generator Tables
-- Run this SQL to add routine template and generated routine tracking tables

-- Table untuk menyimpan template routine
CREATE TABLE IF NOT EXISTS routine_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table untuk menyimpan task template dalam routine
CREATE TABLE IF NOT EXISTS routine_template_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_template_id UUID NOT NULL REFERENCES routine_templates(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(20) DEFAULT 'work' CHECK (category IN ('work', 'learn', 'rest')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    time_start TIME,
    time_end TIME,
    estimated_duration INTEGER, -- in minutes
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint untuk validasi waktu
    CONSTRAINT check_template_time_order 
        CHECK (time_start IS NULL OR time_end IS NULL OR time_start < time_end)
);

-- Table untuk tracking routine yang sudah di-generate per hari
CREATE TABLE IF NOT EXISTS daily_routine_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    routine_template_id UUID NOT NULL REFERENCES routine_templates(id) ON DELETE CASCADE,
    generation_date DATE NOT NULL,
    tasks_generated INTEGER DEFAULT 0,
    generation_status VARCHAR(20) DEFAULT 'completed' CHECK (generation_status IN ('pending', 'completed', 'failed', 'skipped')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate generation per day per routine
    UNIQUE(user_id, routine_template_id, generation_date)
);

-- Table untuk melacak task yang di-generate dari routine (optional tracking)
CREATE TABLE IF NOT EXISTS routine_generated_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    routine_template_id UUID NOT NULL REFERENCES routine_templates(id) ON DELETE CASCADE,
    template_task_id UUID NOT NULL REFERENCES routine_template_tasks(id) ON DELETE CASCADE,
    generation_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_routine_templates_user_id ON routine_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_templates_active ON routine_templates(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_routine_template_tasks_routine_id ON routine_template_tasks(routine_template_id);
CREATE INDEX IF NOT EXISTS idx_routine_template_tasks_order ON routine_template_tasks(routine_template_id, order_index);
CREATE INDEX IF NOT EXISTS idx_routine_template_tasks_active ON routine_template_tasks(routine_template_id, is_active);

CREATE INDEX IF NOT EXISTS idx_daily_routine_generations_user_date ON daily_routine_generations(user_id, generation_date);
CREATE INDEX IF NOT EXISTS idx_daily_routine_generations_template_date ON daily_routine_generations(routine_template_id, generation_date);

CREATE INDEX IF NOT EXISTS idx_routine_generated_tasks_date ON routine_generated_tasks(generation_date);
CREATE INDEX IF NOT EXISTS idx_routine_generated_tasks_template ON routine_generated_tasks(routine_template_id);

-- Add triggers untuk auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_routine_templates_updated_at 
    BEFORE UPDATE ON routine_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routine_template_tasks_updated_at 
    BEFORE UPDATE ON routine_template_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample routine templates (optional)
-- Comment out if you don't want sample data

-- Sample Morning Routine
INSERT INTO routine_templates (user_id, name, description, is_active) 
SELECT 
    u.id,
    'Morning Productivity Routine',
    'Daily morning routine for productivity and focus',
    true
FROM users u LIMIT 1;

-- Get the routine template ID for sample tasks
-- Note: This will only work if there's at least one user in the system