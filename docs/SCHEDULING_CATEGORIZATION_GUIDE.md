# Task Scheduling & Categorization Guide

## 🗓️ Overview

Fitur Task Scheduling & Categorization memungkinkan pengguna untuk:
- Mengatur waktu mulai dan selesai untuk task (time_start, time_end)
- Mengkategorikan task berdasarkan jenis aktivitas (work, learn, rest)
- Memfilter task berdasarkan kategori
- Membuat jadwal harian yang terstruktur

## 📊 Database Schema

### Kolom Baru di Tabel `tasks`:
```sql
-- Kategori task (work, learn, rest)
category VARCHAR(20) DEFAULT 'work' CHECK (category IN ('work', 'learn', 'rest'))

-- Waktu mulai task (format HH:MM)
time_start TIME

-- Waktu selesai task (format HH:MM) 
time_end TIME
```

### Constraints:
- `time_end` harus lebih besar dari `time_start` (jika keduanya diisi)
- `category` harus salah satu dari: work, learn, rest
- Default `category` adalah 'work'

## 🔄 Migration

### Untuk Database Baru:
Gunakan file `migrations/init.sql` yang sudah diupdate.

### Untuk Database Existing:
Jalankan migration file:
```sql
-- File: migrations/add_scheduling_categorization.sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'work' CHECK (category IN ('work', 'learn', 'rest'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_start TIME;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_end TIME;

-- Add constraint untuk validasi waktu
ALTER TABLE tasks ADD CONSTRAINT check_time_order 
    CHECK (time_start IS NULL OR time_end IS NULL OR time_start < time_end);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_time_start ON tasks(time_start);
CREATE INDEX IF NOT EXISTS idx_tasks_category_status ON tasks(category, status);
```

## 📋 API Endpoints

### Create Task dengan Scheduling
```bash
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Morning Meeting",
  "description": "Team standup meeting",
  "category": "work",
  "timeStart": "09:00",
  "timeEnd": "10:00",
  "dueDate": "2025-11-10",
  "priority": "high",
  "status": "pending"
}
```

### Update Task dengan Scheduling
```bash
PUT /api/tasks/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "learn",
  "timeStart": "14:00", 
  "timeEnd": "16:00"
}
```

### Filter Tasks berdasarkan Kategori
```bash
# Filter by category
GET /api/tasks?category=work

# Filter by category + status
GET /api/tasks?category=learn&status=pending

# Filter by category + pagination
GET /api/tasks?category=rest&page=1&limit=5

# Kombinasi semua filter
GET /api/tasks?category=work&status=in_progress&search=meeting&page=1&limit=10
```

## 📝 Field Validation Rules

### Category
- **Values**: `work`, `learn`, `rest`
- **Default**: `work`
- **Required**: No (optional)
- **Example**: `"category": "learn"`

### Time Start
- **Format**: HH:MM (24-hour format)
- **Pattern**: `^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$`
- **Required**: No (optional)
- **Example**: `"timeStart": "09:30"`

### Time End
- **Format**: HH:MM (24-hour format)
- **Pattern**: `^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$`
- **Validation**: Harus lebih besar dari timeStart (jika ada)
- **Required**: No (optional)
- **Example**: `"timeEnd": "11:00"`

## 🧪 Testing Examples

### Valid Requests
```bash
# Task kerja pagi
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Code Review",
    "category": "work", 
    "timeStart": "09:00",
    "timeEnd": "10:30",
    "priority": "high"
  }'

# Task belajar sore
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Study React",
    "category": "learn",
    "timeStart": "14:00", 
    "timeEnd": "16:00",
    "dueDate": "2025-11-10"
  }'

# Task istirahat tanpa waktu spesifik
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Lunch Break",
    "category": "rest"
  }'
```

### Invalid Requests (akan return 400 error)
```bash
# Invalid category
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Invalid Task",
    "category": "invalid_category"
  }'

# Invalid time format
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Invalid Time",
    "timeStart": "25:00"
  }'

# Time end before time start
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Invalid Time Range",
    "timeStart": "15:00",
    "timeEnd": "14:00"
  }'
```

## 📊 Response Examples

### Task with Scheduling Data
```json
{
  "message": "✅ Task created successfully",
  "task": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000", 
    "title": "Morning Meeting",
    "description": "Team standup meeting",
    "status": "pending",
    "priority": "high",
    "category": "work",
    "due_date": "2025-11-10",
    "time_start": "09:00:00",
    "time_end": "10:00:00", 
    "created_at": "2025-11-06T08:00:00.000Z",
    "updated_at": "2025-11-06T08:00:00.000Z"
  }
}
```

### Filtered Tasks Response
```json
{
  "data": [
    {
      "id": "task-1",
      "title": "Code Review", 
      "category": "work",
      "time_start": "09:00:00",
      "time_end": "10:30:00",
      "status": "pending"
    },
    {
      "id": "task-2",
      "title": "Team Meeting",
      "category": "work", 
      "time_start": "14:00:00",
      "time_end": "15:00:00",
      "status": "in_progress"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

## 🎯 Use Cases

### Daily Schedule Management
```bash
# Get work tasks for today
GET /api/tasks?category=work&status=pending

# Get learning schedule
GET /api/tasks?category=learn

# Get rest/break times
GET /api/tasks?category=rest
```

### Time-based Filtering
```bash
# Tasks dengan waktu mulai (untuk jadwal harian)
GET /api/tasks?timeStart=09:00

# Tasks dalam rentang waktu tertentu
# (implementasi future: bisa ditambahkan query time range)
```

### Task Planning by Category
1. **Work Tasks**: Meeting, coding, review, admin
2. **Learn Tasks**: Training, reading, research, course
3. **Rest Tasks**: Break, lunch, recreation, personal time

## 🔮 Future Enhancements

### Possible Additional Features:
1. **Recurring Tasks**: Daily, weekly, monthly schedules
2. **Time Conflict Detection**: Prevent overlapping scheduled tasks
3. **Calendar Integration**: Export to Google Calendar, Outlook
4. **Time Tracking**: Actual vs planned time analysis
5. **Productivity Analytics**: Time spent per category
6. **Task Templates**: Predefined tasks with categories and times
7. **Smart Scheduling**: AI-powered optimal time suggestions

### Additional Validations:
```javascript
// Future validation rules
body('duration')
  .optional()
  .custom((value, { req }) => {
    // Calculate duration from timeStart and timeEnd
    // Validate minimum/maximum duration per category
  })

body('recurringPattern')
  .optional()
  .isIn(['daily', 'weekly', 'monthly', 'custom'])
```

---

**Note**: Fitur scheduling ini memberikan fondasi yang solid untuk time management dan dapat dikembangkan lebih lanjut sesuai kebutuhan pengguna.