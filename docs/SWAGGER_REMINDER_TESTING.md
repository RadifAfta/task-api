# 🔧 Quick Fix: Testing Reminder API di Swagger

## ✅ Issues Fixed

### Issue 1: Double `/api/api/...` Path
**Problem:** Swagger menampilkan URL `http://localhost:3000/api/api/reminders/...` yang salah.

**Root Cause:** 
- Swagger base URL sudah include `/api` 
- Path di route docs juga ditulis `/api/reminders/...`
- Hasil: Double prefix `/api/api/...`

**Solution:** 
- Changed all Swagger paths dari `/api/reminders/...` ke `/reminders/...`
- Swagger akan auto-prefix dengan base URL `/api`
- Final URL: `http://localhost:3000/api/reminders/...` ✅

### Issue 2: `req.user.name` Undefined
**Problem:** API error karena JWT tidak contain `name` field.

**Solution:** 
- Use `telegram_username` atau `email` sebagai fallback
- Fixed di `initiateTelegramConnection()` dan `testReminder()`

---

## 🧪 Testing di Swagger (http://localhost:3000/api-docs)

### Step 1: Login & Get Token

1. **Register User** (jika belum punya):
   - Expand **Auth** section
   - Click `POST /api/auth/register`
   - Click "Try it out"
   - Input:
   ```json
   {
     "email": "test@example.com",
     "password": "Test123456",
     "name": "Test User"
   }
   ```
   - Click "Execute"

2. **Login**:
   - Click `POST /api/auth/login`
   - Click "Try it out"
   - Input:
   ```json
   {
     "email": "test@example.com",
     "password": "Test123456"
   }
   ```
   - Click "Execute"
   - **COPY TOKEN** dari response!

3. **Authorize Swagger**:
   - Klik tombol **🔒 Authorize** di pojok kanan atas Swagger UI
   - Paste token: `Bearer YOUR_TOKEN_HERE`
   - Click "Authorize"
   - Click "Close"

---

### Step 2: Connect Telegram

1. **Generate Verification Code**:
   - Expand **Reminders** section
   - Click `POST /api/reminders/telegram/connect`
   - Click "Try it out"
   - Click "Execute"
   - **COPY verification_code** dari response (misal: `ABC123`)

2. **Open Telegram**:
   - Buka aplikasi Telegram
   - Cari bot Anda (tanya @BotFather untuk username)
   - Start chat dengan bot

3. **Verify di Telegram**:
   - Kirim: `/start`
   - Bot akan balas welcome message
   - Kirim: `/verify ABC123` (gunakan code dari Step 1)
   - Bot akan konfirmasi: "✅ Account Verified Successfully!"

4. **Verify Connection di Swagger**:
   - Click `GET /api/reminders/telegram/config`
   - Click "Try it out"
   - Click "Execute"
   - Response harus show `is_verified: true`

---

### Step 3: Test Notification

1. **Send Test Message**:
   - Click `POST /api/reminders/test`
   - Click "Try it out"
   - Click "Execute"
   - Check Telegram - harus dapat message:
   ```
   🧪 Test Notification
   
   Hi [username]! Your LifePath reminder system is working perfectly! ✅
   
   You'll receive notifications for:
   • Task reminders
   • Daily summaries
   • Routine generation
   • Overdue alerts
   ```

---

### Step 4: Configure Settings (Optional)

1. **View Current Settings**:
   - Click `GET /api/reminders/settings`
   - Click "Try it out"
   - Click "Execute"
   - Lihat default settings

2. **Update Settings**:
   - Click `PUT /api/reminders/settings`
   - Click "Try it out"
   - Edit JSON (contoh):
   ```json
   {
     "enable_task_start_reminder": true,
     "reminder_before_minutes": [5, 15, 30],
     "daily_summary_time": "08:00:00",
     "quiet_hours_enabled": true,
     "quiet_hours_start": "23:00:00",
     "quiet_hours_end": "06:00:00"
   }
   ```
   - Click "Execute"

---

### Step 5: Test with Real Task

1. **Create Task with time_start**:
   - Go to **Tasks** section
   - Click `POST /api/tasks`
   - Click "Try it out"
   - Input (adjust timeStart untuk test - misalnya 10 menit dari sekarang):
   ```json
   {
     "title": "Test Meeting",
     "description": "Testing reminder system",
     "category": "work",
     "priority": "high",
     "dueDate": "2025-11-07",
     "timeStart": "17:00:00",
     "timeEnd": "18:00:00"
   }
   ```
   - Click "Execute"

2. **Check Scheduled Reminders**:
   - Click `GET /api/reminders/pending`
   - Click "Try it out"
   - Click "Execute"
   - Harus show 3 reminders (5, 15, 30 menit sebelum timeStart)

3. **Wait & Check Telegram**:
   - Tunggu sampai waktu reminder (5, 15, 30 menit sebelum 17:00)
   - Check Telegram untuk notification

---

### Step 6: View History

1. **Check Notification History**:
   - Click `GET /api/reminders/history`
   - Set limit: `10`, offset: `0`
   - Click "Execute"
   - Lihat semua notifications yang sudah terkirim

2. **View Statistics**:
   - Click `GET /api/reminders/stats`
   - Set days: `7`
   - Click "Execute"
   - Lihat delivery statistics

---

## 🔍 Debugging di Swagger

### Check Telegram Config
```
GET /api/reminders/telegram/config
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "telegram_user_id": "123456789",
    "telegram_username": "your_username",
    "is_verified": true,
    "is_active": true
  }
}
```

### Check Reminder Settings
```
GET /api/reminders/settings
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "enable_task_start_reminder": true,
    "reminder_before_minutes": [15, 30, 60],
    "daily_summary_time": "07:00:00"
  }
}
```

### Check Pending Reminders
```
GET /api/reminders/pending
```
**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "reminder_type": "task_start",
      "reminder_time": "2025-11-07T16:45:00.000Z",
      "minutes_before": 15,
      "task_title": "Test Meeting"
    }
  ],
  "count": 3
}
```

---

## ❌ Common Errors & Solutions

### Error: "Unauthorized: No token provided"
**Solution:** Click 🔒 Authorize button dan paste token dengan format: `Bearer YOUR_TOKEN`

### Error: "Telegram not configured or not verified"
**Solution:** 
1. Run `POST /api/reminders/telegram/connect` dulu
2. Verify di Telegram dengan `/verify CODE`
3. Retry request

### Error: "Verification code expired"
**Solution:** 
- Code expire setelah 10 menit
- Generate code baru: `POST /api/reminders/telegram/connect`

### Error: "Invalid or expired token"
**Solution:**
- Login lagi untuk get fresh token: `POST /api/auth/login`
- Update authorization di Swagger

---

## 📊 Success Indicators

✅ **Telegram connected**: `is_verified: true` di config  
✅ **Test notification delivered**: Message diterima di Telegram  
✅ **Reminders scheduled**: Pending reminders muncul di list  
✅ **Settings saved**: Update settings berhasil  
✅ **History tracked**: Notification logs tercatat  

---

## 🎯 Next Steps

Setelah semua test berhasil:

1. **Setup Daily Routine** (optional):
   - Create routine template di `POST /api/routines`
   - Routine akan auto-generate tasks tiap hari
   - Tasks otomatis schedule reminders

2. **Monitor System**:
   - Check `GET /api/reminders/stats` berkala
   - Review notification logs
   - Adjust settings sesuai preferensi

3. **Production Use**:
   - Create real tasks dengan timeStart
   - Receive automatic reminders
   - Get daily summaries
   - Stay productive! 🚀

---

**API Server:** http://localhost:3000  
**Swagger Docs:** http://localhost:3000/api-docs  
**Telegram Bot Token:** `8490386876:AAGfd_cYVHjnDZHMk5t3ncfPswhf4uq75Ac`

**Status:** ✅ All APIs Working!
