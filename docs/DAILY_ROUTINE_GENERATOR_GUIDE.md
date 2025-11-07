# 🗓️ Daily Routine Generator Guide

## 📋 Overview

**Daily Routine Generator** adalah fitur yang memungkinkan pengguna untuk:
- **Membuat Template Rutin**: Menyimpan template kegiatan harian yang dapat digunakan berulang
- **Generate Task Otomatis**: Sistem otomatis membuat task dari template setiap hari
- **Scheduling Terintegrasi**: Menggunakan fitur scheduling & categorization yang sudah ada
- **Flexible Management**: CRUD lengkap untuk template dan tracking generation

## 🏗️ Architecture & Database Schema

### Database Tables:

1. **`routine_templates`** - Template rutin utama
2. **`routine_template_tasks`** - Task-task dalam template
3. **`daily_routine_generations`** - Tracking generation harian
4. **`routine_generated_tasks`** - Relasi antara task dan template

### Schema Relationships:
```
users (1) ──→ (N) routine_templates
routine_templates (1) ──→ (N) routine_template_tasks
routine_templates (1) ──→ (N) daily_routine_generations
tasks (1) ──→ (1) routine_generated_tasks
```

## 🚀 Quick Start Guide

### 1. Run Migration
```bash
# Jalankan migration untuk membuat tables
node scripts/run-routine-migration.js
```

### 2. Create Your First Routine Template
```bash
POST /api/routines
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Morning Productivity Routine",
  "description": "Daily morning routine for productivity and focus",
  "isActive": true
}
```

### 3. Add Tasks to Template
```bash
POST /api/routines/{routineId}/tasks/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "tasks": [
    {
      "title": "Wake up & Drink Water",
      "category": "rest",
      "timeStart": "06:00",
      "timeEnd": "06:05",
      "orderIndex": 0
    },
    {
      "title": "Morning Exercise",
      "category": "rest", 
      "priority": "high",
      "timeStart": "06:05",
      "timeEnd": "06:35",
      "orderIndex": 1
    },
    {
      "title": "Review Daily Goals",
      "category": "work",
      "priority": "medium",
      "timeStart": "06:35",
      "timeEnd": "06:45",
      "orderIndex": 2
    }
  ]
}
```

### 4. Generate Today's Tasks
```bash
# Generate from specific routine
POST /api/routines/{routineId}/generate
Authorization: Bearer <token>

# Or generate from ALL active routines
POST /api/routines/generate-all
Authorization: Bearer <token>
```

## 📚 API Endpoints Reference

### 🎯 Routine Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/routines` | Get all routine templates |
| POST | `/api/routines` | Create new routine template |
| GET | `/api/routines/{id}` | Get routine template with tasks |
| PUT | `/api/routines/{id}` | Update routine template |
| DELETE | `/api/routines/{id}` | Delete routine template |

### 📝 Template Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/routines/{routineId}/tasks` | Get all tasks in template |
| POST | `/api/routines/{routineId}/tasks` | Create single template task |
| POST | `/api/routines/{routineId}/tasks/bulk` | Create multiple template tasks |
| PUT | `/api/routines/tasks/{taskId}` | Update template task |
| DELETE | `/api/routines/tasks/{taskId}` | Delete template task |

### ⚡ Generation & Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/routines/{routineId}/generate` | Generate tasks from routine |
| POST | `/api/routines/generate-all` | Generate all active routines |
| GET | `/api/routines/{routineId}/preview` | Preview generation |
| GET | `/api/routines/generation-status` | Check generation status |
| DELETE | `/api/routines/{routineId}/delete-generated` | Delete generated tasks |
| GET | `/api/routines/generation-history` | Get generation history |
| GET | `/api/routines/generated-tasks` | Get generated tasks for date |

### 🤖 Scheduler Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/routines/scheduler/status` | Get scheduler status |
| POST | `/api/routines/scheduler/trigger` | Manual trigger generation |

## 🔧 Automated Scheduler

### Automatic Generation Schedule:
- **06:00 AM** - Primary daily generation
- **00:00 AM** - Midnight generation (for early risers)
- **02:00 AM Sunday** - Weekly cleanup (old records)

### Scheduler Features:
- ✅ **Duplicate Prevention** - Won't generate twice for same date
- ✅ **Error Handling** - Failed generations are logged
- ✅ **Multi-User Support** - Processes all users with active routines
- ✅ **Graceful Shutdown** - Clean server shutdown handling

## 📋 Usage Examples

### Complete Morning Routine Setup

#### 1. Create Morning Routine Template
```bash
POST /api/routines
{
  "name": "Morning Power Hour",
  "description": "High-energy morning routine for maximum productivity"
}
```

#### 2. Add Structured Tasks
```bash
POST /api/routines/{routineId}/tasks/bulk
{
  "tasks": [
    {
      "title": "Wake Up & Hydrate",
      "description": "Drink 500ml water immediately after waking",
      "category": "rest",
      "priority": "high",
      "timeStart": "05:30",
      "timeEnd": "05:35",
      "estimatedDuration": 5,
      "orderIndex": 0
    },
    {
      "title": "Morning Workout",
      "description": "20-minute high-intensity workout",
      "category": "rest",
      "priority": "high", 
      "timeStart": "05:35",
      "timeEnd": "05:55",
      "estimatedDuration": 20,
      "orderIndex": 1
    },
    {
      "title": "Meditation & Mindfulness",
      "description": "10 minutes guided meditation",
      "category": "rest",
      "priority": "medium",
      "timeStart": "05:55",
      "timeEnd": "06:05",
      "estimatedDuration": 10,
      "orderIndex": 2
    },
    {
      "title": "Review Goals & Plan Day",
      "description": "Review goals and create daily action plan",
      "category": "work",
      "priority": "high",
      "timeStart": "06:05",
      "timeEnd": "06:20",
      "estimatedDuration": 15,
      "orderIndex": 3
    },
    {
      "title": "Learning Session",
      "description": "Read or study for 25 minutes",
      "category": "learn",
      "priority": "medium",
      "timeStart": "06:20",
      "timeEnd": "06:45",
      "estimatedDuration": 25,
      "orderIndex": 4
    }
  ]
}
```

#### 3. Preview Generation
```bash
GET /api/routines/{routineId}/preview?date=2025-11-07
```

#### 4. Generate Today's Tasks
```bash
POST /api/routines/{routineId}/generate
{
  "date": "2025-11-07"
}
```

### Work Routine Example

#### Evening Work Routine
```bash
POST /api/routines
{
  "name": "Evening Work Session",
  "description": "Focused evening work routine"
}

# Add tasks
POST /api/routines/{routineId}/tasks/bulk
{
  "tasks": [
    {
      "title": "Review Daily Progress",
      "category": "work",
      "priority": "high",
      "timeStart": "19:00",
      "timeEnd": "19:15"
    },
    {
      "title": "Deep Work Session",
      "category": "work", 
      "priority": "high",
      "timeStart": "19:15",
      "timeEnd": "21:00"
    },
    {
      "title": "Plan Tomorrow",
      "category": "work",
      "priority": "medium",
      "timeStart": "21:00",
      "timeEnd": "21:15"
    }
  ]
}
```

## 🎛️ Management & Monitoring

### Check Generation Status
```bash
# Today's status
GET /api/routines/generation-status

# Specific date
GET /api/routines/generation-status?date=2025-11-07
```

### View Generated Tasks
```bash
# All generated tasks for today
GET /api/routines/generated-tasks?date=2025-11-07

# From specific routine only
GET /api/routines/generated-tasks?date=2025-11-07&routineId={id}
```

### Generation History
```bash
# Recent generation history
GET /api/routines/generation-history

# Filter by routine and date range
GET /api/routines/generation-history?routineId={id}&fromDate=2025-11-01&toDate=2025-11-07
```

### Delete Generated Tasks
```bash
# Delete specific routine's generated tasks for a date
DELETE /api/routines/{routineId}/delete-generated
{
  "date": "2025-11-07"
}
```

## 🔍 Advanced Features

### Bulk Template Management
```bash
# Get all active routines
GET /api/routines?active=true

# Get all routines (including inactive)
GET /api/routines?active=false&page=1&limit=20
```

### Manual Scheduler Trigger
```bash
# Check scheduler status
GET /api/routines/scheduler/status

# Manually trigger generation for all users
POST /api/routines/scheduler/trigger
```

### Template Task Reordering
```bash
# Update task order
PUT /api/routines/tasks/{taskId}
{
  "orderIndex": 5,
  "timeStart": "06:50",
  "timeEnd": "07:10"
}
```

## ⚠️ Important Notes

### Generation Rules:
1. **No Duplicates**: Can't generate same routine twice for same date
2. **Active Only**: Only active templates and tasks are processed
3. **Future Limit**: Can only generate up to 30 days in future
4. **Past Deletion**: Can only delete generated tasks up to 90 days old

### Time Validation:
- Time format must be **HH:MM** (24-hour)
- **timeEnd** must be after **timeStart**
- Duration calculations are automatic
- Times are stored in database as TIME type

### Category Integration:
- Uses same categories as regular tasks: **work**, **learn**, **rest**
- Generated tasks inherit all template properties
- Filters work across both regular and generated tasks

## 🧪 Testing Scenarios

### Complete Test Flow
```bash
# 1. Create routine template
POST /api/routines
{
  "name": "Test Routine",
  "description": "Testing routine generator"
}

# 2. Add test tasks
POST /api/routines/{routineId}/tasks/bulk
{
  "tasks": [
    {
      "title": "Morning Task",
      "category": "work",
      "timeStart": "08:00",
      "timeEnd": "08:30"
    },
    {
      "title": "Learning Task", 
      "category": "learn",
      "timeStart": "08:30",
      "timeEnd": "09:00"
    }
  ]
}

# 3. Preview generation
GET /api/routines/{routineId}/preview

# 4. Generate tasks
POST /api/routines/{routineId}/generate

# 5. Verify generation
GET /api/routines/generation-status
GET /api/routines/generated-tasks?date=2025-11-07

# 6. Test duplicate prevention
POST /api/routines/{routineId}/generate
# Should return "already generated" message

# 7. Cleanup
DELETE /api/routines/{routineId}/delete-generated
{
  "date": "2025-11-07"
}
```

## 🚀 Production Deployment

### Environment Setup:
1. **Database Migration**: Ensure all routine tables exist
2. **Scheduler Config**: Timezone set to your region in schedulerService.js
3. **Cron Jobs**: Automatic scheduler starts with server
4. **Error Logging**: Monitor console for generation failures
5. **Cleanup**: Weekly cleanup runs automatically

### Performance Considerations:
- **Indexes**: All necessary indexes created by migration
- **Bulk Operations**: Use bulk task creation for efficiency  
- **Pagination**: All list endpoints support pagination
- **Connection Pooling**: Uses existing database pool

### Monitoring:
- Check scheduler status via API
- Monitor generation history for failures
- Track task generation metrics
- Database cleanup runs weekly

---

**🎉 Daily Routine Generator is now ready to automate your daily task creation! Start building your productive routines today!**