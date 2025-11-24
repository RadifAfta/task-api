// ===========================================
// ERD DIAGRAM - DBDIAGRAM.IO FORMAT
// Task Management API Database Schema
// Generated: November 20, 2025
// Copy-paste this to: https://dbdiagram.io/
// ===========================================

Table users {
  id uuid [pk, default: `uuid_generate_v4()`]
  name varchar(100) [not null]
  email varchar(100) [unique, not null]
  password_hash text [not null]
  role varchar(10) [default: 'user', note: 'user or admin']
  created_at timestamp [default: `CURRENT_TIMESTAMP`]
  updated_at timestamp [default: `CURRENT_TIMESTAMP`]

  indexes {
    email [unique]
    role
  }
}

Table tasks {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [ref: > users.id, on delete: cascade]
  title varchar(150) [not null]
  description text
  status varchar(20) [default: 'pending', note: 'pending, in_progress, done']
  priority varchar(10) [default: 'medium', note: 'low, medium, high']
  category varchar(20) [default: 'work', note: 'work, learn, rest']
  due_date date
  time_start time
  time_end time
  created_at timestamp [default: `CURRENT_TIMESTAMP`]
  updated_at timestamp [default: `CURRENT_TIMESTAMP`]

  indexes {
    user_id
    status
    priority
    category
    due_date
    time_start
    (category, status)
    (user_id, status)
  }

  note: "Task with scheduling and categorization features"
}

Table user_telegram_config {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [ref: > users.id, on delete: cascade, unique]
  telegram_chat_id bigint [unique]
  telegram_username varchar(100)
  is_verified boolean [default: false]
  verification_code varchar(10)
  verification_expires_at timestamp
  is_active boolean [default: true]
  created_at timestamp [default: `CURRENT_TIMESTAMP`]
  updated_at timestamp [default: `CURRENT_TIMESTAMP`]

  indexes {
    user_id
    telegram_chat_id
    (user_id, is_active, is_verified)
  }

  note: "Telegram bot configuration per user"
}

Table reminder_settings {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [ref: > users.id, on delete: cascade, unique]
  reminder_before_minutes integer[] [default: `ARRAY[15, 30, 60]`]
  daily_summary_time time [default: '08:00:00']
  enable_task_start_reminder boolean [default: true]
  enable_task_due_reminder boolean [default: true]
  enable_daily_summary boolean [default: true]
  enable_routine_generation_notice boolean [default: true]
  notify_pending_tasks boolean [default: true]
  notify_overdue_tasks boolean [default: true]
  notify_completed_milestone boolean [default: false]
  quiet_hours_enabled boolean [default: false]
  quiet_hours_start time [default: '22:00:00']
  quiet_hours_end time [default: '07:00:00']
  created_at timestamp [default: `CURRENT_TIMESTAMP`]
  updated_at timestamp [default: `CURRENT_TIMESTAMP`]

  indexes {
    user_id
  }

  note: "User reminder preferences and settings"
}

Table notification_logs {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [ref: > users.id, on delete: cascade]
  task_id uuid [ref: > tasks.id, on delete: cascade]
  notification_type varchar(50) [not null, note: 'task_start, task_due, daily_summary, routine_generated, overdue']
  notification_channel varchar(20) [default: 'telegram', note: 'telegram, email, push']
  message_title varchar(255)
  message_body text
  scheduled_at timestamp
  sent_at timestamp
  delivery_status varchar(20) [default: 'pending', note: 'pending, sent, failed, skipped']
  failure_reason text
  telegram_message_id bigint
  created_at timestamp [default: `CURRENT_TIMESTAMP`]

  indexes {
    user_id
    task_id
    notification_type
    delivery_status
    scheduled_at
  }

  note: "Log of all sent notifications"
}

Table scheduled_reminders {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [ref: > users.id, on delete: cascade]
  task_id uuid [ref: > tasks.id, on delete: cascade]
  reminder_type varchar(50) [not null, note: 'task_start, task_due']
  reminder_time timestamp [not null]
  minutes_before integer
  is_sent boolean [default: false]
  sent_at timestamp
  created_at timestamp [default: `CURRENT_TIMESTAMP`]

  indexes {
    user_id
    task_id
    reminder_time
    is_sent
    (user_id, task_id, reminder_type, reminder_time) [unique]
  }

  note: "Scheduled reminders for tasks"
}

Table routine_templates {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [ref: > users.id, on delete: cascade]
  name varchar(100) [not null]
  description text
  is_active boolean [default: true]
  created_at timestamp [default: `CURRENT_TIMESTAMP`]
  updated_at timestamp [default: `CURRENT_TIMESTAMP`]

  indexes {
    user_id
    (user_id, is_active)
  }

  note: "Daily routine templates"
}

Table routine_template_tasks {
  id uuid [pk, default: `gen_random_uuid()`]
  routine_template_id uuid [ref: > routine_templates.id, on delete: cascade]
  title varchar(255) [not null]
  description text
  category varchar(20) [default: 'work', note: 'work, learn, rest']
  priority varchar(10) [default: 'medium', note: 'low, medium, high']
  time_start time
  time_end time
  estimated_duration integer [note: 'in minutes']
  order_index integer [default: 0]
  is_active boolean [default: true]
  created_at timestamp [default: `CURRENT_TIMESTAMP`]
  updated_at timestamp [default: `CURRENT_TIMESTAMP`]

  indexes {
    routine_template_id
    (routine_template_id, order_index)
    (routine_template_id, is_active)
  }

  note: "Tasks within routine templates"
}

Table daily_routine_generations {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [ref: > users.id, on delete: cascade]
  routine_template_id uuid [ref: > routine_templates.id, on delete: cascade]
  generation_date date [not null]
  tasks_generated integer [default: 0]
  generation_status varchar(20) [default: 'completed', note: 'pending, completed, failed, skipped']
  created_at timestamp [default: `CURRENT_TIMESTAMP`]

  indexes {
    (user_id, generation_date)
    (routine_template_id, generation_date)
    (user_id, routine_template_id, generation_date) [unique]
  }

  note: "Tracking of routine generations per day"
}

Table routine_generated_tasks {
  id uuid [pk, default: `gen_random_uuid()`]
  task_id uuid [ref: > tasks.id, on delete: cascade]
  routine_template_id uuid [ref: > routine_templates.id, on delete: cascade]
  template_task_id uuid [ref: > routine_template_tasks.id, on delete: cascade]
  generation_date date [not null]
  created_at timestamp [default: `CURRENT_TIMESTAMP`]

  indexes {
    generation_date
    routine_template_id
  }

  note: "Links tasks to their routine generation source"
}