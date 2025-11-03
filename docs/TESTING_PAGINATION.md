# Testing Pagination Implementation

## 🧪 Manual Testing Steps

### 1. Start Server
```bash
npm start
# atau
node app.js
```

### 2. Register & Login
```bash
# Register user baru
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "testuser",
    "email": "test@example.com", 
    "password": "password123"
  }'

# Login dan simpan token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Create Sample Tasks (Buat beberapa task untuk testing)
```bash
# Ganti <TOKEN> dengan token dari login
TOKEN="your_jwt_token_here"

# Task 1
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Task 1 - Urgent",
    "description": "Ini adalah task pertama yang urgent",
    "status": "pending",
    "priority": "high"
  }'

# Task 2
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Task 2 - Belajar Swagger",
    "description": "Belajar implementasi Swagger di Express",
    "status": "in_progress",
    "priority": "medium"
  }'

# Task 3
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Task 3 - Database Migration",
    "description": "Setup database dan migration",
    "status": "done",
    "priority": "high"
  }'

# Buat beberapa task lagi untuk melihat pagination...
```

### 4. Test Pagination Endpoints

#### Basic Pagination
```bash
# Default (page=1, limit=10)
curl -X GET "http://localhost:4000/api/tasks" \
  -H "Authorization: Bearer $TOKEN"

# Page 1 dengan limit 2
curl -X GET "http://localhost:4000/api/tasks?page=1&limit=2" \
  -H "Authorization: Bearer $TOKEN"

# Page 2 dengan limit 2  
curl -X GET "http://localhost:4000/api/tasks?page=2&limit=2" \
  -H "Authorization: Bearer $TOKEN"
```

#### Pagination dengan Filter
```bash
# Filter berdasarkan status
curl -X GET "http://localhost:4000/api/tasks?status=pending&page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# Search dengan pagination
curl -X GET "http://localhost:4000/api/tasks?search=belajar&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Kombinasi filter
curl -X GET "http://localhost:4000/api/tasks?status=pending&search=urgent&page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

#### Edge Cases
```bash
# Page 0 (should default to page 1)
curl -X GET "http://localhost:4000/api/tasks?page=0&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# Limit terlalu besar (should cap at 100)
curl -X GET "http://localhost:4000/api/tasks?page=1&limit=1000" \
  -H "Authorization: Bearer $TOKEN"

# Page yang tidak ada (should return empty data)
curl -X GET "http://localhost:4000/api/tasks?page=999&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

## 📊 Expected Response Format

### Success Response
```json
{
  "data": [
    {
      "id": "uuid-here",
      "title": "Task Title",
      "description": "Task Description", 
      "status": "pending",
      "priority": "medium",
      "user_id": "user-uuid",
      "created_at": "2025-11-03T10:00:00Z",
      "updated_at": "2025-11-03T10:00:00Z",
      "due_date": "2025-12-31"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Empty Results
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

## 🔍 Validation Checklist

- [ ] Default pagination works (page=1, limit=10)
- [ ] Custom page and limit work correctly
- [ ] Status filter works with pagination
- [ ] Search filter works with pagination  
- [ ] Combined filters work
- [ ] Pagination metadata is correct
- [ ] Edge cases handled properly (page=0, limit>100)
- [ ] Empty results return correct format
- [ ] Performance is acceptable with large datasets

## 🐛 Common Issues & Solutions

### Issue: "Cannot read property 'tasks'"
**Solution**: Check that `getTasksByUser` returns `{ tasks: [], total: 0 }`

### Issue: Pagination metadata incorrect
**Solution**: Verify `total` count query includes same WHERE conditions

### Issue: OFFSET performance slow
**Solution**: Add database index on `user_id` and `created_at`

### Issue: Limit not working
**Solution**: Check that `limit` and `offset` parameters are integers

## 📈 Performance Tips

1. **Database Index**:
```sql
CREATE INDEX idx_tasks_user_created ON tasks(user_id, created_at DESC);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_search ON tasks USING gin(to_tsvector('english', title || ' ' || description));
```

2. **Caching**: Consider caching results for popular queries

3. **Cursor Pagination**: For very large datasets, consider cursor-based pagination instead of OFFSET