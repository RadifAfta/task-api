# Pagination Implementation Guide

## Konsep Pagination

Pagination adalah teknik untuk membagi data yang besar menjadi halaman-halaman kecil yang lebih mudah dikelola. Ini meningkatkan performa aplikasi dan user experience.

## Parameter Query

### Query Parameters untuk Pagination

```
GET /api/tasks?page=1&limit=10&status=pending&search=belajar
```

| Parameter | Type | Default | Deskripsi |
|-----------|------|---------|-----------|
| `page` | integer | 1 | Nomor halaman (minimum: 1) |
| `limit` | integer | 10 | Jumlah item per halaman (maximum: 100) |
| `status` | string | - | Filter berdasarkan status task |
| `search` | string | - | Pencarian berdasarkan title/description |

## Response Format

### Struktur Response dengan Pagination

```json
{
  "data": [
    {
      "id": "1",
      "title": "Task 1",
      "description": "Description 1",
      "status": "pending",
      "createdAt": "2025-11-03T10:00:00Z"
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

### Penjelasan Metadata Pagination

- **page**: Halaman saat ini
- **limit**: Jumlah item per halaman
- **total**: Total seluruh data (tanpa filter pagination)
- **totalPages**: Total jumlah halaman
- **hasNext**: Boolean, apakah ada halaman selanjutnya
- **hasPrevious**: Boolean, apakah ada halaman sebelumnya

## Implementasi di Database

### SQL Query dengan OFFSET dan LIMIT

```sql
-- Contoh query dengan pagination
SELECT * FROM tasks 
WHERE user_id = ? 
AND status = ?
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- Query untuk menghitung total data
SELECT COUNT(*) as total FROM tasks 
WHERE user_id = ? 
AND status = ?;
```

### Perhitungan Offset

```javascript
const page = 2;
const limit = 10;
const offset = (page - 1) * limit; // (2-1) * 10 = 10
// Ini akan skip 10 record pertama dan ambil 10 record berikutnya
```

## Penggunaan di Frontend

### JavaScript/Fetch API

```javascript
const fetchTasks = async (page = 1, limit = 10) => {
  const response = await fetch(`/api/tasks?page=${page}&limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const result = await response.json();
  
  console.log('Tasks:', result.data);
  console.log('Current page:', result.pagination.page);
  console.log('Total pages:', result.pagination.totalPages);
  
  return result;
};
```

### React Component Example

```jsx
const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchTasks(currentPage).then(result => {
      setTasks(result.data);
      setPagination(result.pagination);
    });
  }, [currentPage]);

  const handleNextPage = () => {
    if (pagination.hasNext) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (pagination.hasPrevious) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div>
      {/* Render tasks */}
      {tasks.map(task => <TaskItem key={task.id} task={task} />)}
      
      {/* Pagination controls */}
      <div>
        <button 
          onClick={handlePrevPage} 
          disabled={!pagination.hasPrevious}
        >
          Previous
        </button>
        
        <span>Page {pagination.page} of {pagination.totalPages}</span>
        
        <button 
          onClick={handleNextPage} 
          disabled={!pagination.hasNext}
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

## Best Practices

### 1. Validasi Input
```javascript
// Pastikan page >= 1
const page = Math.max(1, parseInt(query.page) || 1);

// Batasi limit maximum untuk mencegah abuse
const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
```

### 2. Database Indexing
```sql
-- Index untuk kolom yang sering digunakan untuk sorting/filtering
CREATE INDEX idx_tasks_user_created ON tasks(user_id, created_at);
CREATE INDEX idx_tasks_status ON tasks(status);
```

### 3. Caching
```javascript
// Cache hasil query yang sama
const cacheKey = `tasks:${userId}:${page}:${limit}:${status}`;
const cachedResult = await redis.get(cacheKey);

if (cachedResult) {
  return JSON.parse(cachedResult);
}
```

## Error Handling

### Validasi Page Number
```javascript
if (page < 1) {
  return res.status(400).json({
    message: "Page number must be greater than 0"
  });
}

if (page > totalPages && total > 0) {
  return res.status(404).json({
    message: "Page not found"
  });
}
```

## Testing dengan Postman

### Test Cases

1. **Default pagination**
   ```
   GET /api/tasks
   Expected: page=1, limit=10
   ```

2. **Custom page dan limit**
   ```
   GET /api/tasks?page=2&limit=5
   Expected: page=2, limit=5
   ```

3. **Filter dengan pagination**
   ```
   GET /api/tasks?page=1&limit=10&status=pending&search=urgent
   Expected: Filtered results with pagination
   ```

4. **Edge cases**
   ```
   GET /api/tasks?page=0 (should default to page=1)
   GET /api/tasks?limit=1000 (should cap at 100)
   GET /api/tasks?page=999 (should return empty or error)
   ```

## Performance Considerations

1. **Database**: Gunakan LIMIT/OFFSET, tapi hati-hati dengan OFFSET besar (slow)
2. **Alternative**: Cursor-based pagination untuk dataset besar
3. **Caching**: Cache hasil query yang sering diakses
4. **Index**: Pastikan kolom sorting ter-index dengan baik

## Cursor-Based Pagination (Advanced)

Untuk dataset yang sangat besar, gunakan cursor-based pagination:

```javascript
// Instead of page/offset, use cursor (last seen ID)
GET /api/tasks?cursor=12345&limit=10

// Response includes next cursor
{
  "data": [...],
  "nextCursor": "12355",
  "hasNext": true
}
```