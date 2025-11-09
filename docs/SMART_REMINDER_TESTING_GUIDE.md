# Smart Reminder System - Testing & Implementation Guide

## 📋 Overview
Smart Reminder System adalah fitur pengingat otomatis terintegrasi dengan Telegram Bot yang mengirimkan notifikasi untuk:
- **Task Start Reminders**: Pengingat sebelum task dimulai (15/30/60 menit sebelumnya)
- **Due Date Reminders**: Pengingat 1 hari sebelum deadline
- **Daily Summary**: Ringkasan task harian
- **Routine Generation Notice**: Notifikasi saat routine dijalankan
- **Overdue Alerts**: Peringatan untuk task yang terlambat

---

## 🚀 Setup & Installation

### 1. Database Migration
Jalankan migration untuk membuat tabel reminder system:

```bash
node scripts/run-reminder-migration.js
```

**Tabel yang dibuat:**
- `user_telegram_config` - Konfigurasi Telegram per user
- `reminder_settings` - Preferensi reminder per user  
- `scheduled_reminders` - Queue reminder yang akan dikirim
- `notification_logs` - History notifikasi yang terkirim

### 2. Create Telegram Bot
1. Buka Telegram dan cari **@BotFather**
2. Kirim command `/newbot`
3. Ikuti instruksi untuk membuat bot baru
4. Copy **Bot Token** yang diberikan
5. Tambahkan ke file `.env`:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

### 3. Install Dependencies
Package `node-telegram-bot-api` sudah terinstall. Jika perlu install ulang:

```bash
npm install node-telegram-bot-api
```

### 4. Start Server
```bash
npm start
```

Pastikan muncul log:
```
🤖 Telegram Bot initialized successfully
🔔 Smart reminder scheduler started:
   ⏰ Processing reminders every minute
   ⚠️ Checking overdue every 6 hours
   📊 Daily summaries every 15 minutes (user-based)
```

---

## 🔐 Telegram Bot Setup (User Side)

### Step 1: Generate Verification Code
**Endpoint:** `POST /api/reminders/telegram/connect`

```bash
curl -X POST http://localhost:3000/api/reminders/telegram/connect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code generated",
  "data": {
    "verification_code": "ABC123",
    "expires_at": "2024-01-10T10:30:00.000Z",
    "instructions": [
      "1. Open Telegram and search for your LifePath bot",
      "2. Send /start command to the bot",
      "3. Send /verify ABC123",
      "4. Wait for confirmation",
      "5. Come back here to check status"
    ]
  }
}
```

### Step 2: Connect to Telegram Bot
1. Buka Telegram
2. Cari bot Anda (nama yang dibuat di BotFather)
3. Kirim command: `/start`
4. Bot akan membalas dengan welcome message
5. Kirim command: `/verify ABC123` (gunakan code dari Step 1)
6. Bot akan konfirmasi jika berhasil

### Step 3: Verify Connection
**Endpoint:** `GET /api/reminders/telegram/config`

```bash
curl http://localhost:3000/api/reminders/telegram/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "telegram_user_id": "123456789",
    "telegram_username": "john_doe",
    "is_verified": true,
    "is_active": true,
    "created_at": "2024-01-10T09:00:00.000Z",
    "updated_at": "2024-01-10T09:05:00.000Z"
  }
}
```

---

## ⚙️ Reminder Settings

### Get Current Settings
**Endpoint:** `GET /api/reminders/settings`

```bash
curl http://localhost:3000/api/reminders/settings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Default Settings:**
```json
{
  "success": true,
  "data": {
    "enable_task_start_reminder": true,
    "enable_task_due_reminder": true,
    "enable_daily_summary": true,
    "enable_routine_generation_notice": true,
    "notify_overdue_tasks": true,
    "reminder_before_minutes": [15, 30, 60],
    "daily_summary_time": "07:00:00",
    "quiet_hours_enabled": false,
    "quiet_hours_start": "22:00:00",
    "quiet_hours_end": "06:00:00"
  }
}
```

### Update Settings
**Endpoint:** `PUT /api/reminders/settings`

```bash
curl -X PUT http://localhost:3000/api/reminders/settings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enable_task_start_reminder": true,
    "reminder_before_minutes": [15, 30],
    "daily_summary_time": "08:00:00",
    "quiet_hours_enabled": true,
    "quiet_hours_start": "23:00:00",
    "quiet_hours_end": "07:00:00"
  }'
```

**Setting Options:**

| Setting | Type | Description |
|---------|------|-------------|
| `enable_task_start_reminder` | boolean | Aktifkan reminder sebelum task dimulai |
| `enable_task_due_reminder` | boolean | Aktifkan reminder 1 hari sebelum deadline |
| `enable_daily_summary` | boolean | Aktifkan ringkasan task harian |
| `enable_routine_generation_notice` | boolean | Aktifkan notifikasi routine generation |
| `notify_overdue_tasks` | boolean | Aktifkan alert untuk task terlambat |
| `reminder_before_minutes` | array | Waktu reminder sebelum task (menit) |
| `daily_summary_time` | string | Jam pengiriman daily summary (HH:MM:SS) |
| `quiet_hours_enabled` | boolean | Aktifkan quiet hours (no notifications) |
| `quiet_hours_start` | string | Jam mulai quiet hours (HH:MM:SS) |
| `quiet_hours_end` | string | Jam selesai quiet hours (HH:MM:SS) |

---

## 🧪 Testing Scenarios

### Test 1: Telegram Connection
1. Generate verification code via API
2. Connect via Telegram bot dengan `/verify`
3. Verify status via API
4. Test notification dengan endpoint `/api/reminders/test`

### Test 2: Task Reminder
1. **Create task with time_start:**
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Morning Meeting",
    "description": "Team standup",
    "category": "work",
    "priority": "high",
    "dueDate": "2024-01-10",
    "timeStart": "09:00:00",
    "timeEnd": "10:00:00"
  }'
```

2. **Check scheduled reminders:**
```bash
curl http://localhost:3000/api/reminders/pending \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

3. **Wait for reminder time** (15/30/60 minutes before 09:00)
4. **Check Telegram** untuk notifikasi

### Test 3: Daily Summary
1. Set `daily_summary_time` to current time + 2 minutes
2. Wait for scheduler to run (checks every 15 minutes)
3. Check Telegram for summary message

### Test 4: Routine Generation Notice
1. Create routine template
2. Run manual generation atau wait for scheduled time
3. Check Telegram for generation notice

### Test 5: Overdue Alert
1. Create task with past due_date
2. Wait for overdue checker (runs every 6 hours) or trigger manual
3. Check Telegram for overdue alert

---

## 📊 Notification History & Stats

### View Notification History
**Endpoint:** `GET /api/reminders/history?limit=20&offset=0`

```bash
curl http://localhost:3000/api/reminders/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "notification_type": "task_start",
      "message_title": "Reminder: Morning Meeting",
      "message_body": "Starting in 15 minutes",
      "scheduled_at": "2024-01-10T08:45:00.000Z",
      "sent_at": "2024-01-10T08:45:05.000Z",
      "delivery_status": "sent",
      "task_title": "Morning Meeting"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "count": 1
  }
}
```

### View Statistics
**Endpoint:** `GET /api/reminders/stats?days=30`

```bash
curl http://localhost:3000/api/reminders/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period_days": 30,
    "statistics": [
      {
        "notification_type": "task_start",
        "total_sent": 45,
        "total_failed": 2,
        "success_rate": 95.74
      },
      {
        "notification_type": "daily_summary",
        "total_sent": 28,
        "total_failed": 0,
        "success_rate": 100.00
      }
    ]
  }
}
```

---

## 🔧 Admin Operations

### Manual Trigger - Process Pending Reminders
**Endpoint:** `POST /api/reminders/trigger/process`

```bash
curl -X POST http://localhost:3000/api/reminders/trigger/process \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Manual Trigger - Send Daily Summaries
**Endpoint:** `POST /api/reminders/trigger/summaries`

```bash
curl -X POST http://localhost:3000/api/reminders/trigger/summaries \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Manual Trigger - Check Overdue Tasks
**Endpoint:** `POST /api/reminders/trigger/overdue`

```bash
curl -X POST http://localhost:3000/api/reminders/trigger/overdue \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

## 🤖 Telegram Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Initialize bot and get welcome message |
| `/verify <code>` | Verify account dengan 6-digit code |
| `/status` | Check connection status and settings |
| `/help` | Show available commands |

---

## 📝 Scheduler Configuration

### Automated Jobs:
1. **Reminder Processor**: Runs every minute
   - Checks `scheduled_reminders` table
   - Sends notifications via Telegram
   - Respects quiet hours
   - Logs delivery status

2. **Overdue Checker**: Runs every 6 hours
   - Finds tasks past due date
   - Sends overdue alerts
   - Avoids duplicate notifications (24h cooldown)

3. **Daily Summary**: Runs every 15 minutes
   - Checks users with matching `daily_summary_time`
   - Sends summary of today's tasks
   - Skips if no tasks

4. **Routine Generator**: Runs at 00:00 and 06:00
   - Generates daily tasks from templates
   - Sends generation notice if enabled

---

## 🐛 Troubleshooting

### Bot tidak merespon di Telegram
- Pastikan `TELEGRAM_BOT_TOKEN` benar di `.env`
- Restart server setelah update token
- Check console log: `🤖 Telegram Bot initialized successfully`

### Reminder tidak terkirim
1. Check telegram configuration: `GET /api/reminders/telegram/config`
2. Verify `is_verified` dan `is_active` = true
3. Check reminder settings: `GET /api/reminders/settings`
4. Verify scheduler running di console logs
5. Check `scheduled_reminders` table di database

### Notifikasi terkirim saat quiet hours
- Check `quiet_hours_enabled` = true
- Verify `quiet_hours_start` dan `quiet_hours_end` correct
- Update settings: `PUT /api/reminders/settings`

### Scheduled reminders tidak dibuat saat create task
- Pastikan task memiliki `timeStart` atau `dueDate`
- Check telegram config: must be verified & active
- Check reminder settings: must enable respective reminders

---

## 📦 Database Schema

### user_telegram_config
```sql
- user_id (FK)
- telegram_chat_id
- telegram_user_id
- telegram_username
- verification_code (6 char)
- verification_expires_at
- is_verified
- is_active
```

### reminder_settings
```sql
- user_id (FK)
- enable_task_start_reminder
- enable_task_due_reminder
- enable_daily_summary
- enable_routine_generation_notice
- notify_overdue_tasks
- reminder_before_minutes (array)
- daily_summary_time
- quiet_hours_enabled
- quiet_hours_start
- quiet_hours_end
```

### scheduled_reminders
```sql
- id
- user_id (FK)
- task_id (FK)
- reminder_type (task_start, task_due, etc)
- reminder_time
- minutes_before
- is_sent
- sent_at
```

### notification_logs
```sql
- id
- user_id (FK)
- task_id (FK, nullable)
- notification_type
- message_title
- message_body
- scheduled_at
- sent_at
- delivery_status (sent, failed, skipped)
- failure_reason
- telegram_message_id
```

---

## 🎯 End-to-End Test Flow

### Complete User Journey:
1. **User registers** → JWT token received
2. **Connect Telegram** → POST `/api/reminders/telegram/connect` → Verification code
3. **Open Telegram** → `/start` → `/verify CODE` → Verified ✅
4. **Configure settings** → PUT `/api/reminders/settings` → Preferences saved
5. **Create task** → POST `/api/tasks` with timeStart → Reminders scheduled automatically
6. **Wait for time** → Scheduler processes → Notification sent to Telegram 🔔
7. **View history** → GET `/api/reminders/history` → See sent notifications
8. **View stats** → GET `/api/reminders/stats` → Analytics

### Success Indicators:
- ✅ Telegram bot responds to commands
- ✅ Verification successful
- ✅ Scheduled reminders created when task created
- ✅ Notification received on Telegram at correct time
- ✅ Notification logged in database
- ✅ Daily summary received at configured time

---

## 🚀 Production Deployment Checklist

- [ ] Run database migration
- [ ] Create Telegram bot via @BotFather
- [ ] Add `TELEGRAM_BOT_TOKEN` to production `.env`
- [ ] Test bot in production environment
- [ ] Monitor scheduler logs for errors
- [ ] Set up monitoring for notification delivery
- [ ] Configure backup for notification_logs
- [ ] Test all notification types
- [ ] Verify quiet hours logic
- [ ] Test graceful shutdown (SIGTERM/SIGINT)

---

## 📞 Support

Jika ada issue atau pertanyaan:
1. Check server logs untuk error messages
2. Verify database tables created correctly
3. Test Telegram bot connection manually
4. Review notification_logs for delivery status
5. Check scheduled_reminders queue

---

**Happy Testing! 🎉**
