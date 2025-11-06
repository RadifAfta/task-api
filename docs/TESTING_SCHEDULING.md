# 🧪 Testing Guide: Task Scheduling & Categorization

## Quick Test Commands

### 1. Test Create Task with Scheduling

```bash
# Work task dengan jadwal
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Morning Standup Meeting",
    "description": "Daily team sync",
    "category": "work",
    "timeStart": "09:00",
    "timeEnd": "09:30",
    "priority": "medium",
    "status": "pending"
  }'

# Learn task dengan jadwal panjang
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "React Advanced Concepts",
    "description": "Study hooks and context API",
    "category": "learn", 
    "timeStart": "14:00",
    "timeEnd": "17:00",
    "dueDate": "2025-11-10"
  }'

# Rest task tanpa waktu spesifik
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Lunch Break",
    "category": "rest",
    "priority": "low"
  }'
```

### 2. Test Category Filtering

```bash
# Filter work tasks
curl -X GET "http://localhost:3000/api/tasks?category=work" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter learn tasks  
curl -X GET "http://localhost:3000/api/tasks?category=learn" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter rest tasks
curl -X GET "http://localhost:3000/api/tasks?category=rest" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Kombinasi filter: work tasks yang pending
curl -X GET "http://localhost:3000/api/tasks?category=work&status=pending" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Test Update Task with Scheduling

```bash
# Update existing task dengan scheduling info
curl -X PUT http://localhost:3000/api/tasks/TASK_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "work",
    "timeStart": "10:00",
    "timeEnd": "12:00",
    "status": "in_progress"
  }'
```

### 4. Test Validation Errors

```bash
# Invalid category (should return 400)
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Invalid Task",
    "category": "invalid_category"
  }'

# Invalid time format (should return 400)
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Invalid Time",
    "timeStart": "25:61",
    "timeEnd": "invalid_time"
  }'

# Time end before time start (should return 400)
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Invalid Time Range",
    "timeStart": "15:00",
    "timeEnd": "14:00"
  }'
```

## Expected Responses

### ✅ Success Response (Create)
```json
{
  "message": "✅ Task created successfully",
  "task": {
    "id": "uuid-here",
    "user_id": "user-uuid",
    "title": "Morning Standup Meeting",
    "description": "Daily team sync",
    "status": "pending",
    "priority": "medium", 
    "category": "work",
    "due_date": null,
    "time_start": "09:00:00",
    "time_end": "09:30:00",
    "created_at": "2025-11-06T...",
    "updated_at": "2025-11-06T..."
  }
}
```

### ✅ Success Response (Filter)
```json
{
  "data": [
    {
      "id": "uuid1", 
      "title": "Morning Meeting",
      "category": "work",
      "time_start": "09:00:00",
      "time_end": "09:30:00",
      "status": "pending"
    },
    {
      "id": "uuid2",
      "title": "Code Review", 
      "category": "work",
      "time_start": "14:00:00",
      "time_end": "15:30:00", 
      "status": "in_progress"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

### ❌ Error Response (Validation)
```json
{
  "message": "❌ Validation error",
  "errors": [
    {
      "field": "category",
      "message": "Category must be one of: work, learn, rest"
    },
    {
      "field": "timeStart", 
      "message": "Time must be in HH:MM format (e.g., 09:30)"
    },
    {
      "field": "timeEnd",
      "message": "End time must be after start time"
    }
  ]
}
```

## Test Scenarios Checklist

### ✅ Basic Functionality
- [ ] Create task dengan category work
- [ ] Create task dengan category learn  
- [ ] Create task dengan category rest
- [ ] Create task dengan timeStart & timeEnd
- [ ] Create task tanpa waktu (optional fields)
- [ ] Update task dengan scheduling info
- [ ] Filter tasks by category
- [ ] Filter kombinasi category + status

### ✅ Validation Tests
- [ ] Invalid category value
- [ ] Invalid time format (25:00, abc:def)
- [ ] Time end before time start
- [ ] Empty time start dengan time end (should work)
- [ ] Time start tanpa time end (should work)

### ✅ Edge Cases
- [ ] Midnight times (00:00, 23:59)
- [ ] Same time start and end
- [ ] Create task dengan semua fields null
- [ ] Update task dari scheduled ke non-scheduled
- [ ] Pagination dengan category filter

### ✅ Integration Tests
- [ ] Multiple users dengan different categories
- [ ] Bulk create tasks dengan different schedules
- [ ] Performance dengan large number of scheduled tasks
- [ ] Database constraints working properly

## Testing with Postman

### Environment Variables
```
BASE_URL = http://localhost:3000
JWT_TOKEN = your-jwt-token-here
```

### Collection Structure
```
📁 Task Scheduling Tests
├── 📁 Authentication
│   └── 🔑 Login & Get Token
├── 📁 Create Tasks
│   ├── ✅ Create Work Task
│   ├── ✅ Create Learn Task  
│   ├── ✅ Create Rest Task
│   └── ❌ Create Invalid Task
├── 📁 Filter Tasks
│   ├── 🔍 Filter by Work
│   ├── 🔍 Filter by Learn
│   ├── 🔍 Filter by Rest
│   └── 🔍 Combined Filters
└── 📁 Update Tasks
    ├── ✏️ Add Scheduling to Task
    └── ✏️ Remove Scheduling from Task
```

---

**Tips**: 
1. Test semua endpoints dengan Swagger UI di http://localhost:3000/api-docs
2. Cek database langsung untuk memverifikasi data tersimpan dengan benar
3. Monitor console untuk error logs selama testing
4. Test dengan user yang berbeda untuk memastikan isolation