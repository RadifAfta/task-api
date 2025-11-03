# Swagger Documentation Testing Guide

## 🚀 Akses Swagger UI

1. **Start Server**:
   ```bash
   node app.js
   ```

2. **Buka Browser**:
   ```
   http://localhost:4000/api-docs
   ```

## 🔐 Authentication Flow untuk Testing

### Step 1: Register User Baru
1. Buka section **Auth** di Swagger UI
2. Klik endpoint **POST /auth/register**
3. Klik **"Try it out"**
4. Masukkan data:
   ```json
   {
     "username": "testuser",
     "email": "test@example.com",
     "password": "password123"
   }
   ```
5. Klik **Execute**
6. Harapan: Response 201 dengan data user yang dibuat

### Step 2: Login untuk Mendapat Token
1. Klik endpoint **POST /auth/login**
2. Klik **"Try it out"**
3. Masukkan data:
   ```json
   {
     "email": "test@example.com",
     "password": "password123"
   }
   ```
4. Klik **Execute**
5. **COPY TOKEN** dari response untuk langkah selanjutnya

### Step 3: Setup Authorization
1. Scroll ke atas Swagger UI
2. Klik tombol **"Authorize"** (ikon gembok)
3. Masukkan: `Bearer YOUR_JWT_TOKEN_HERE`
4. Klik **"Authorize"**
5. Klik **"Close"**

## 📋 Testing Task Endpoints

### Create Task
1. Buka section **Tasks**
2. Klik **POST /tasks**
3. Klik **"Try it out"**
4. Masukkan data:
   ```json
   {
     "title": "Test Task 1",
     "description": "This is a test task",
     "dueDate": "2025-12-31"
   }
   ```
5. Klik **Execute**

### Get All Tasks (dengan Pagination)
1. Klik **GET /tasks**
2. Klik **"Try it out"**
3. Coba berbagai parameter:
   - **Default**: Kosongkan semua parameter
   - **Pagination**: page=1, limit=5
   - **Filter**: status=pending
   - **Search**: search=test
4. Klik **Execute**

### Get Single Task
1. Klik **GET /tasks/{id}**
2. Klik **"Try it out"**
3. Masukkan ID dari task yang sudah dibuat
4. Klik **Execute**

### Update Task
1. Klik **PUT /tasks/{id}**
2. Klik **"Try it out"**
3. Masukkan ID task dan data update:
   ```json
   {
     "title": "Updated Task Title",
     "status": "in_progress"
   }
   ```
4. Klik **Execute**

### Delete Task
1. Klik **DELETE /tasks/{id}**
2. Klik **"Try it out"**
3. Masukkan ID task
4. Klik **Execute**

## 👨‍💼 Testing Admin Endpoints (Optional)

**Note**: Untuk test admin endpoints, Anda perlu:
1. Membuat user dengan role admin di database, atau
2. Menggunakan endpoint update role (jika tersedia)

### Get All Users (Admin Only)
1. Pastikan token dari user dengan role admin
2. Klik **GET /admin/users**
3. Klik **"Try it out"**
4. Klik **Execute**

### Get All Tasks from All Users
1. Klik **GET /admin/tasks**
2. Klik **"Try it out"**
3. Klik **Execute**

### Update User Role
1. Klik **PUT /admin/users/{id}/role**
2. Masukkan user ID dan role baru:
   ```json
   {
     "role": "admin"
   }
   ```

## 🧪 Test Scenarios untuk Validation

### 1. Authentication Tests
- ✅ Register dengan data valid
- ❌ Register dengan email yang sudah ada
- ❌ Register tanpa required fields
- ✅ Login dengan credentials benar
- ❌ Login dengan password salah
- ❌ Login dengan email tidak terdaftar

### 2. Task Tests
- ✅ Create task dengan data lengkap
- ❌ Create task tanpa title (required field)
- ✅ Get tasks dengan berbagai filter
- ✅ Pagination dengan page & limit
- ❌ Access task tanpa token
- ❌ Get task dengan ID tidak valid

### 3. Pagination Tests
- ✅ Default pagination (page=1, limit=10)
- ✅ Custom pagination (page=2, limit=5)
- ✅ Filter + pagination (status=pending&page=1)
- ✅ Search + pagination (search=test&limit=3)
- ❌ Invalid page (page=0) → should default to 1
- ❌ Limit terlalu besar (limit=1000) → should cap at 100

### 4. Admin Tests (jika role admin tersedia)
- ✅ Get all users sebagai admin
- ❌ Get all users sebagai user biasa
- ✅ Update user role
- ❌ Delete user sebagai user biasa

## 📊 Response Validation Checklist

### Auth Responses
- [ ] Register return user object tanpa password
- [ ] Login return token dan user info
- [ ] Error responses include proper status codes

### Task Responses
- [ ] Task objects include semua fields yang diperlukan
- [ ] Pagination metadata benar (page, limit, total, etc.)
- [ ] Filter dan search berfungsi dengan benar
- [ ] Protected endpoints require authentication

### Admin Responses
- [ ] Admin endpoints require admin role
- [ ] User list tidak include password
- [ ] Task list include user information

## 🔧 Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Pastikan token sudah di-set di Authorization
   - Periksa token masih valid (belum expired)
   - Pastikan format: `Bearer YOUR_TOKEN`

2. **403 Forbidden**
   - User tidak memiliki role yang diperlukan
   - Untuk admin endpoints, pastikan role = "admin"

3. **404 Not Found**
   - Periksa ID yang digunakan valid
   - Pastikan data exists di database

4. **400 Bad Request**
   - Periksa format JSON request
   - Pastikan required fields terisi
   - Validasi tipe data (string, number, etc.)

### Debug Tips
- Gunakan browser developer tools → Network tab
- Cek response body untuk error details
- Pastikan Content-Type: application/json
- Verifikasi request structure sesuai schema

## 📝 Sample Data untuk Testing

### Users
```json
{
  "username": "user1",
  "email": "user1@test.com", 
  "password": "password123"
}

{
  "username": "admin1",
  "email": "admin@test.com",
  "password": "admin123"
}
```

### Tasks
```json
{
  "title": "Urgent Task",
  "description": "This needs immediate attention",
  "status": "pending",
  "priority": "high",
  "dueDate": "2025-11-10"
}

{
  "title": "Learning Project",
  "description": "Study new framework",
  "status": "in_progress", 
  "priority": "medium"
}
```

---

**Happy Testing! 🎉**

Pastikan untuk test semua endpoint dan scenario untuk memvalidasi API bekerja dengan benar.