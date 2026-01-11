# Life Path - AI Assistant 🎯

> Advanced Task Management API with REST endpoints, Telegram Bot integration, Routine Management, and Smart Reminders.

Project ini adalah backend API untuk aplikasi task management yang terintegrasi dengan Telegram bot. Dibangun dengan Node.js + Express dan PostgreSQL.

---

## 📑 Table of Contents

- [Quick Start](#-quick-start-untuk-team-baru)
- [Fitur Utama](#-fitur-utama)
- [Setup Lengkap](#-setup-lengkap)
- [Struktur Project](#-struktur-project)
- [API Documentation](#-api-documentation)
- [Telegram Bot](#-telegram-bot-commands)
- [Testing & Debug](#-testing--debugging)
- [FAQ & Troubleshooting](#-faq--troubleshooting)

---

## 🚀 Quick Start (Untuk Team Baru)

### Langkah Cepat (5 Menit Setup)

```bash
# 1. Clone & Install
git clone <repo-url>
cd task-api
npm install

# 2. Setup Environment
cp .env.example .env
# Edit .env dengan kredensial database & Telegram token Anda

# 3. Setup Database
# Buat database baru di PostgreSQL:
createdb task_api_db
# Atau via psql:
# psql -U postgres -c "CREATE DATABASE task_api_db;"

# 4. Run Migrations
node scripts/run-migration.js
node scripts/run-reminder-migration.js
node scripts/run-routine-migration.js

# 5. Start Server
npm start

# ✅ Server ready di http://localhost:4000
# 📚 Swagger docs di http://localhost:4000/api-docs
```

### Verifikasi Setup
```bash
# Check server berjalan
curl http://localhost:4000/

# Expected output:
# {"message":"Task API Running 🚀","version":"1.0.0"}
```

---

## ✨ Fitur Utama

### 🔐 Authentication & Authorization
- JWT-based authentication (register/login)
- Telegram account verification
- Protected routes with token verification

### 📋 Task Management
- Full CRUD operations for tasks
- Interactive task creation via Telegram
- Task categorization and prioritization
- Due date management

### 💰 Financial Management ✨
- Income and expense tracking
- Transaction categorization
- Financial summaries and reports
- Date-range based analytics
- Budget monitoring

### �🔄 Routine Management ✨
- Create and manage routine templates
- Auto-generate daily tasks from routines
- Interactive routine creation with task templates
- Routine activation/deactivation
- Enhanced routine management UI

### 🤖 Telegram Bot Integration ✨
- Interactive command system (`/menu`, `/addtask`, `/myroutines`, etc.)
- Real-time task and routine management
- Smart reminders and notifications
- User-friendly button interfaces
- Enhanced command menu with latest features

### ⏰ Smart Reminder System
- Automated task reminders
- Overdue task alerts
- Daily summary notifications
- Configurable reminder schedules

### 📅 Scheduler System
- Daily routine generation (6 AM & midnight)
- Weekly cleanup tasks
- Automated task processing
- Timezone-aware scheduling (Asia/Jakarta)

---

## 📋 Prasyarat

Pastikan sistem Anda sudah terinstall:

| Tool | Version | Cara Install | Cek Version |
|------|---------|--------------|-------------|
| **Node.js** | >= 18.0.0 | [Download](https://nodejs.org/) | `node --version` |
| **npm** | >= 8.0.0 | Included with Node.js | `npm --version` |
| **PostgreSQL** | >= 12.0 | [Download](https://www.postgresql.org/) | `psql --version` |
| **Telegram Bot Token** | - | [Cara Buat Bot](#cara-membuat-telegram-bot) | - |

### Cara Membuat Telegram Bot

1. Buka Telegram dan cari [@BotFather](https://t.me/botfather)
2. Kirim command `/newbot`
3. Ikuti instruksi: berikan nama dan username bot
4. Copy **Bot Token** yang diberikan
5. Paste token ke file `.env` pada `TELEGRAM_BOT_TOKEN`

---

## 🛠️ Setup Lengkap

### Step 1: Clone Repository

```bash
git clone <repo-url>
cd task-api
```

### Step 2: Install Dependencies

```bash
npm install
```

**Verifikasi**: Pastikan tidak ada error saat install. Jika ada error terkait node version, gunakan nvm:
```bash
nvm install 18
nvm use 18
```

### Step 3: Setup Database PostgreSQL

**Option A: Via Command Line**
```bash
# Login ke PostgreSQL
psql -U postgres

# Buat database
CREATE DATABASE task_api_db;

# Buat user (opsional)
CREATE USER task_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE task_api_db TO task_user;

# Keluar
\q
```

**Option B: Via pgAdmin**
1. Buka pgAdmin
2. Right-click Databases → Create → Database
3. Nama: `task_api_db`
4. Save

### Step 4: Setup Environment Variables

Buat file `.env` di root folder (copy dari contoh di bawah):
```env
# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=4000
NODE_ENV=development

# JWT Secret (WAJIB! Generate string random min 32 karakter)
# Generate via: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_jwt_secret_here_min_32_chars

# ============================================
# DATABASE CONFIGURATION (PostgreSQL)
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=task_api_db
DB_USER=postgres          # Ganti dengan user PostgreSQL Anda
DB_PASSWORD=postgres      # Ganti dengan password PostgreSQL Anda

# ============================================
# TELEGRAM BOT (Dapatkan dari @BotFather)
# ============================================
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# ============================================
# OPTIONAL: Email Notifications
# ============================================
# EMAIL_USER=your_email@gmail.com
# EMAIL_PASS=your_app_password

# ============================================
# OPTIONAL: Future Features
# ============================================
# REDIS_URL=redis://localhost:6379
# OPENAI_API_KEY=your_openai_key_for_future_ai_features
```

**💡 Tips Generate JWT_SECRET:**
```bash
# Via Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Via OpenSSL
openssl rand -hex 32
```

#### 📊 Environment Variables Reference

| Variable | Required | Default | Description | Notes |
|----------|----------|---------|-------------|-------|
| `PORT` | ❌ | `4000` | Server port | Bisa diubah jika port 4000 sudah terpakai |
| `NODE_ENV` | ❌ | `development` | Environment mode | `development` atau `production` |
| `JWT_SECRET` | ✅ | - | JWT signing secret | **Min 32 karakter!** Generate random string |
| `DB_HOST` | ✅ | - | PostgreSQL host | Default: `localhost` |
| `DB_PORT` | ❌ | `5432` | PostgreSQL port | Default port PostgreSQL |
| `DB_NAME` | ✅ | - | Database name | Nama database yang dibuat |
| `DB_USER` | ✅ | - | Database user | User PostgreSQL (biasanya `postgres`) |
| `DB_PASSWORD` | ✅ | - | Database password | Password user PostgreSQL |
| `TELEGRAM_BOT_TOKEN` | ✅* | - | Telegram bot token | *Wajib untuk fitur bot. Dapatkan dari @BotFather |
| `EMAIL_USER` | ❌ | - | Email for notifications | Untuk fitur email notifications (future) |
| `EMAIL_PASS` | ❌ | - | Email app password | App password dari email provider |

**Catatan:** 
- ✅ = Wajib diisi
- ❌ = Opsional (ada default atau belum digunakan)
- *Telegram bot features akan disabled jika token tidak disediakan

### Step 5: Run Database Migrations

Jalankan migration scripts untuk membuat table-table yang diperlukan:

```bash
# 1. Migration utama (users, tasks, dll)
node scripts/run-migration.js

# 2. Migration reminder system
node scripts/run-reminder-migration.js

# 3. Migration routine system
node scripts/run-routine-migration.js

# 4. Verifikasi tables sudah terbuat
node scripts/verify-tables.js
```

**Expected Output:**
```
✅ Migration completed successfully
✅ Tables created: users, tasks, routines, reminders, transactions
```

### Step 6: Start Server

```bash
# Production mode
npm start

# Development mode (dengan auto-reload)
nodemon app.js
```

**Server akan berjalan di:**
- API Server: `http://localhost:4000`
- Swagger Docs: `http://localhost:4000/api-docs`
- Telegram Bot: Otomatis start (cek log)

**Cek log untuk memastikan:**
```
🚀 Server running on http://localhost:4000
📚 Swagger docs available at http://localhost:4000/api-docs
🤖 Telegram bot initialized successfully
⏰ Scheduler initialized: Daily routines & Smart reminders active
```

Default server berjalan di: `http://localhost:4000/`
Swagger docs: `http://localhost:4000/api-docs`

## Struktur Project

Project ini menggunakan **3-layer architecture** (Controller → Service → Model) untuk separation of concerns yang baik.

```
├── app.js                    # Entry point aplikasi
├── swagger.js               # OpenAPI/Swagger configuration
├── config/
│   └── db.js               # Database connection
├── controllers/             # 🎮 HTTP Request Handlers
│   ├── adminController.js  # Admin operations (uses AdminService)
│   ├── authController.js   # Authentication logic (uses UserService)
│   ├── reminderController.js # Reminder management (uses ReminderService)
│   ├── routineController.js # Routine management (uses RoutineService)
│   ├── taskController.js   # Task CRUD operations (uses TaskService)
│   ├── telegramController.js # Telegram bot operations (uses multiple services)
│   └── transactionController.js # Transaction management (uses TransactionService)
├── services/                # 🧠 Business Logic Layer
│   ├── adminService.js     # Admin operations & system stats
│   ├── reminderService.js  # Reminder business logic
│   ├── routineService.js   # Routine generation logic
│   ├── schedulerService.js # Task scheduling & cron jobs
│   ├── taskService.js      # Task CRUD & validations
│   ├── telegramService.js  # Telegram bot logic
│   ├── transactionService.js # Transaction management
│   └── userService.js      # User management
├── models/                  # 💾 Data Access Layer
│   ├── reminderModel.js    # Reminder database operations
│   ├── routineModel.js     # Routine database operations
│   ├── taskModel.js        # Task database operations
│   ├── transactionModel.js # Transaction database operations
│   └── userModel.js        # User database operations
├── middlewares/
│   ├── authMiddleware.js   # JWT verification
│   ├── customErrorMiddleware.js # Error handling
│   ├── roleMiddleware.js   # Role-based access
│   └── validationMiddleware.js # Input validation
├── routes/
│   ├── adminRoute.js       # Admin endpoints
│   ├── authRoute.js        # Auth endpoints
│   ├── index.js            # Main router
│   ├── reminderRoute.js    # Reminder endpoints
│   ├── routineRoute.js     # Routine endpoints
│   ├── taskRoute.js        # Task endpoints
│   ├── telegramRoute.js    # Telegram bot endpoints
│   └── transactionRoute.js # Transaction endpoints
├── docs/                    # 📚 Documentation
│   ├── SERVICE_LAYER_ARCHITECTURE.md # Architecture guide
│   └── ...                 # Other documentation
├── migrations/              # Database migration scripts
├── scripts/                 # Utility scripts
├── utils/
│   ├── pagination.js        # Pagination utilities
│   └── response.js          # Response formatters
├── public/                  # Static files
└── README.md

```

### 🏗️ Architecture Pattern

**Controllers** (HTTP Layer)
- Handle HTTP requests/responses
- Call service methods
- Return formatted responses
- **No direct database access**

**Services** (Business Logic)
- Business logic & data processing
- Call models for database operations
- Orchestrate multiple operations
- Return standardized format: `{ success, data/error }`

**Models** (Data Access)
- Direct database queries
- Data persistence
- Return raw data

**📖 Detailed Architecture Guide:** See [docs/SERVICE_LAYER_ARCHITECTURE.md](docs/SERVICE_LAYER_ARCHITECTURE.md)

---

## 📝 API Documentation

### Base URL
```
http://localhost:4000/api
```

### Authentication

Sebagian besar endpoint memerlukan JWT token. Dapatkan token dari endpoint `/auth/login`.

**Header Format:**
```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### API Endpoints Overview

| Category | Endpoint | Method | Auth | Description |
|----------|----------|--------|------|-------------|
| **Auth** | `/auth/register` | POST | ❌ | Register user baru |
| | `/auth/login` | POST | ❌ | Login & dapatkan token |
| | `/auth/verify-telegram` | POST | ✅ | Verifikasi akun Telegram |
| **Tasks** | `/tasks` | GET | ✅ | List semua tasks |
| | `/tasks` | POST | ✅ | Buat task baru |
| | `/tasks/:id` | GET | ✅ | Detail task |
| | `/tasks/:id` | PUT | ✅ | Update task |
| | `/tasks/:id` | DELETE | ✅ | Hapus task |
| | `/tasks/:id/complete` | POST | ✅ | Mark task selesai |
| **Routines** | `/routines` | GET | ✅ | List routines |
| | `/routines` | POST | ✅ | Buat routine |
| | `/routines/:id` | GET/PUT/DELETE | ✅ | Manage routine |
| | `/routines/generate/:id` | POST | ✅ | Generate tasks dari routine |
| **Transactions** | `/transactions` | GET | ✅ | List transactions |
| | `/transactions` | POST | ✅ | Buat transaction |
| | `/transactions/summary` | GET | ✅ | Financial summary |
| **Reminders** | `/reminders` | GET/POST | ✅ | Manage reminders |
| | `/reminders/:id` | PUT/DELETE | ✅ | Update/hapus reminder |
| **Admin** | `/admin/users` | GET | 🔑 | List all users |
| | `/admin/stats` | GET | 🔑 | System statistics |

**Legend:**
- ❌ = Public (tidak perlu auth)
- ✅ = Requires Bearer Token
- 🔑 = Admin Only

### Detailed Endpoints

#### Authentication Endpoints

##### POST `/auth/register`
Register user baru.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user_id": "uuid-here",
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

##### POST `/auth/login`
Login dan dapatkan JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "user_id": "uuid-here",
      "username": "johndoe",
      "email": "john@example.com"
    }
  }
}
```

#### Task Endpoints

##### GET `/tasks`
List semua tasks user (dengan pagination).

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (pending/completed)
- `category` (optional): Filter by category

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/tasks?page=1&limit=20&status=pending"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "tasks": [
      {
        "task_id": "uuid",
        "title": "Complete project",
        "description": "Finish task API",
        "status": "pending",
        "priority": "high",
        "category": "work",
        "due_date": "2026-01-15",
        "created_at": "2026-01-11T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

##### POST `/tasks`
Buat task baru.

**Request Body:**
```json
{
  "title": "Complete project documentation",
  "description": "Update README and API docs",
  "priority": "high",
  "category": "work",
  "due_date": "2026-01-15",
  "time_start": "09:00",
  "time_end": "17:00"
}
```

#### Transaction Endpoints

##### POST `/transactions`
Buat transaction (income/expense).

**Request Body:**
```json
{
  "type": "income",
  "amount": 5000000,
  "category": "salary",
  "description": "Monthly salary January 2026",
  "transaction_date": "2026-01-01"
}
```

##### GET `/transactions/summary`
Dapatkan summary finansial.

**Query Parameters:**
- `dateFrom` (optional): Start date (YYYY-MM-DD)
- `dateTo` (optional): End date (YYYY-MM-DD)

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/transactions/summary?dateFrom=2026-01-01&dateTo=2026-01-31"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "summary": {
      "totalIncome": 10000000,
      "totalExpense": 3500000,
      "balance": 6500000,
      "transactionCount": 25
    },
    "byCategory": {
      "income": {
        "salary": 8000000,
        "freelance": 2000000
      },
      "expense": {
        "food": 1500000,
        "transport": 500000,
        "bills": 1500000
      }
    }
  }
}
```

### Error Responses

Semua error mengikuti format standar:

```json
{
  "status": "error",
  "message": "Deskripsi error",
  "errors": ["Detail error jika ada"]
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (token invalid/missing)
- `403` - Forbidden (tidak punya akses)
- `404` - Not Found
- `500` - Internal Server Error

### Rate Limiting

API memiliki rate limiting untuk mencegah abuse:
- Default: 100 requests per 15 menit per IP
- Authentication endpoints: 5 requests per 15 menit

Jika exceeded, akan dapat response `429 Too Many Requests`.

---

## API Endpoints (Legacy)

---

## 🤖 Telegram Bot Commands

### Setup Bot

1. Dapatkan Bot Token dari [@BotFather](https://t.me/botfather)
2. Set `TELEGRAM_BOT_TOKEN` di file `.env`
3. Restart server - bot akan otomatis start
4. Cari bot di Telegram dan mulai chat dengan `/start`

### Available Commands

#### 🔑 Authentication & Setup
```
/start          - Mulai bot dan tampilkan welcome message
/login <email>  - Login dengan email (akan dapat kode verifikasi)
/verify <code>  - Verifikasi akun dengan kode dari app
/status         - Cek status koneksi akun
```

**Example Flow:**
```
1. /start
2. /login john@example.com
3. /verify 123456 (kode dari API response)
4. ✅ Akun terverifikasi!
```

#### 📝 Task Management
```
/menu           - 🎯 Tampilkan menu utama dengan buttons
/addtask        - ➕ Tambah task baru (interactive wizard)
/quickadd       - ⚡ Quick add task (format singkat)
/today          - 📅 Lihat tasks hari ini
/mytasks        - 📋 Kelola semua tasks
/help           - ❓ Bantuan lengkap
```

**Interactive Features:**
- Button navigation untuk kemudahan
- Step-by-step task creation
- Inline buttons untuk edit/delete
- Real-time status updates

#### 🔄 Routine Management
```
/addroutine       - ➕ Buat routine template baru
/myroutines       - 📋 Lihat & kelola routine templates
/generateroutine  - 🎯 Generate daily tasks dari routine
```

**Routine Features:**
- Create routine dengan multiple tasks
- Auto-generate opsi setelah creation
- Activate/deactivate routines
- Edit routine templates

#### 💰 Financial Management
```
/transactions          - 💰 View all transactions
/transactions_today    - 📅 Today's transactions only
/transaction_summary   - 📊 Financial summary & analytics
```

**Financial Features:**
- Track income & expenses
- Category breakdown
- Balance calculations
- Date range filtering

### Bot Usage Examples

#### Example 1: Create Task
```
User: /addtask
Bot:  📝 Ayo buat task baru! 
      Masukkan judul task:

User: Complete project documentation
Bot:  Great! Sekarang masukkan deskripsi:

User: Update README and add API examples
Bot:  Pilih priority:
      [High] [Medium] [Low]

... (continue interactive flow)
```

#### Example 2: Quick Add
```
User: /quickadd Beli groceries
Bot:  ✅ Task created successfully!
      
      📝 Beli groceries
      Priority: medium (default)
      Status: pending
```

#### Example 3: View Today's Tasks
```
User: /today
Bot:  📅 Tasks for today (Jan 11, 2026):
      
      1. ✅ Complete documentation - DONE
      2. ⏳ Review pull requests - Pending
      3. 🔴 Team meeting at 2 PM - Pending
      
      Total: 3 tasks (1 completed, 2 pending)
```

### Bot Features

✅ **Implemented:**
- Interactive command menu dengan buttons
- Real-time notifications
- Button-based navigation
- Smart task categorization
- Routine template management
- Financial transaction tracking
- Automated reminders
- Daily task summaries
- Multi-language support (ID/EN)

🚧 **Coming Soon:**
- Voice command support
- Task sharing dengan team members
- Calendar integration
- AI-powered task suggestions

### Bot Tips & Tricks

1. **Use /menu for quick access** - Tampilkan semua commands dengan sekali klik
2. **Setup daily reminders** - Bot akan otomatis kirim reminder untuk tasks
3. **Use quick actions** - Buttons memudahkan mark task complete tanpa typing
4. **Generate routines** - Setup routine sekali, generate tasks otomatis setiap hari

---

## 🔄 Routine Management System ✨

### Fitur Utama
- **Routine Templates**: Buat template routine dengan multiple tasks
- **Auto Generation**: Generate daily tasks otomatis dari routine
- **Interactive Creation**: UI wizard untuk membuat routine
- **Task Templates**: Kelola task templates dalam routine
- **Activation Control**: Aktifkan/nonaktifkan routine kapan saja

### Cara Penggunaan
1. Buat routine template: `/addroutine`
2. Tambah tasks ke routine saat creation atau via `/myroutines`
3. Generate routine: `/generateroutine` atau gunakan auto-generate
4. Kelola routines: `/myroutines` untuk edit, activate/deactivate

### Database Schema
- `routine_templates`: Template routine (name, description, is_active)
- `routine_template_tasks`: Tasks dalam routine template
- `routine_generations`: History generation routine

## 💰 Financial Management System ✨

### Fitur Utama
- **Transaction Tracking**: Record income and expenses with categories
- **Financial Analytics**: View summaries, balances, and spending patterns
- **Date Range Filtering**: Analyze finances over specific periods
- **Category Management**: Organize transactions by custom categories
- **Real-time Updates**: Instant financial status via Telegram bot

### Cara Penggunaan
1. Record transactions: Via API atau Telegram bot commands
2. View transactions: `/transactions` untuk semua, `/transactions_today` untuk hari ini
3. Check summary: `/transaction_summary` untuk ringkasan keuangan
4. Monitor spending: Lihat breakdown income vs expense

### Database Schema
- `transactions`: User transactions (type, amount, category, description, date)
- Transaction types: income, expense
- Automatic balance calculations

## ⏰ Scheduler & Reminder System

### Automated Tasks
- **Daily Routine Generation**: 6:00 AM dan 00:00 AM (WIB)
- **Reminder Processing**: Setiap menit
- **Overdue Checks**: Setiap 6 jam
- **Daily Summaries**: Setiap 15 menit berdasarkan user activity
- **Weekly Cleanup**: Setiap hari Minggu pukul 2:00 AM

### Reminder Types
- **Task Reminders**: Notifikasi untuk task yang akan due
- **Overdue Alerts**: Peringatan untuk task yang terlewat
- **Daily Summaries**: Ringkasan task harian
- **Routine Notifications**: Pemberitahuan generation routine

### Configuration
Scheduler menggunakan `node-cron` dengan timezone Asia/Jakarta. Semua konfigurasi ada di `services/schedulerService.js`.

---

## 🧪 Testing & Debugging

### Quick Test API

```bash
# 1. Health Check
curl http://localhost:4000/

# 2. Register User Baru
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123!",
    "full_name": "Test User"
  }'

# 3. Login & Dapatkan Token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'

# Copy token dari response, lalu:
export TOKEN="your_jwt_token_here"

# 4. Test Protected Endpoint
curl http://localhost:4000/api/tasks \
  -H "Authorization: Bearer $TOKEN"
```

### Testing dengan Postman

1. **Import Collection** (jika ada file Postman collection)
2. **Setup Environment:**
   - `baseUrl`: `http://localhost:4000/api`
   - `token`: (akan otomatis ter-set setelah login)

3. **Test Flow:**
   ```
   Register → Login → Get Token → Test Endpoints
   ```

4. **Postman Tips:**
   - Gunakan environment variables untuk `{{baseUrl}}` dan `{{token}}`
   - Set auto-update token di Tests tab setelah login:
     ```javascript
     pm.environment.set("token", pm.response.json().token);
     ```

### Testing Telegram Bot

1. Cari bot Anda di Telegram (username yang dibuat di BotFather)
2. Start chat: `/start`
3. Test commands:
   ```
   /menu        → Lihat semua commands
   /help        → Bantuan
   /addtask     → Buat task baru
   /today       → Lihat task hari ini
   ```

### Debug Mode

```bash
# Enable detailed logging
NODE_ENV=development nodemon app.js

# Check scheduler status (butuh auth)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/routines/scheduler/status

# Monitor logs
tail -f logs/app.log  # Jika menggunakan file logging
```

### Common Debugging Commands

```bash
# Check PostgreSQL connection
psql -U postgres -d task_api_db -c "\dt"

# View database tables
psql -U postgres -d task_api_db -c "SELECT * FROM users LIMIT 5;"

# Check if port 4000 is in use
netstat -ano | findstr :4000  # Windows
lsof -i :4000                 # Linux/Mac

# Restart PostgreSQL (if needed)
# Windows: Services → PostgreSQL → Restart
# Linux: sudo systemctl restart postgresql
```

---

## 📝 Contoh Lengkap dengan curl

### Register
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password"}'
```

Login:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

Create Task (ganti <token>):
```bash
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"Tugas 1","description":"Desc"}'
```

## Testing dengan Postman
1. Jalankan server.
2. Register -> login -> simpan token (Postman: Authorization Bearer Token atau di header `Authorization: Bearer <token>`).
3. Panggil endpoint /api/tasks menggunakan token.

Buat Collection di Postman dengan environment variabel `baseUrl = http://localhost:4000/api` dan `token`.

## Error handling & Debug
- Pastikan `NODE_ENV=development` saat development untuk mendapatkan pesan error yang informatif.
- Cek console/log saat terjadi error (app.js menampilkan stack trace pada error middleware).

## Menambahkan Database
Jika controller membutuhkan DB:
1. Tambahkan dependensi (mis. mongoose, pg, sequelize).
2. Tambahkan koneksi di file baru (`db.js`) dan panggil sebelum app.listen.
3. Simpan detail koneksi di .env (DATABASE_URL / MONGO_URI).

## Scripts & Commands

### Available Scripts
```json
{
  "scripts": {
    "start": "node app.js",
    "build": "npm ci --only=production",
    "postinstall": "echo 'Installation completed'",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

**Note**: Untuk development dengan auto-reload, install nodemon secara global atau tambahkan script:
```bash
npm install -g nodemon
nodemon app.js
```

### Migration Commands
```bash
# Run initial migration
node scripts/run-migration.js

# Run reminder system migration
node scripts/run-reminder-migration.js

# Run routine system migration
node scripts/run-routine-migration.js

# Verify database tables
node scripts/verify-tables.js
```

### Development Commands
```bash
# Start production server
npm start

# Start with auto-reload (requires nodemon installed)
nodemon app.js

# Check syntax
node -c app.js
node -c services/telegramService.js
```

## Contribution
- Fork repo, buat branch per fitur/bugfix, buat PR.
- Sertakan deskripsi perubahan dan cara menguji.

## License
Tambahkan lisensi sesuai kebutuhan (mis. MIT).

---

## ❓ FAQ & Troubleshooting

### Setup & Installation

<details>
<summary><b>Q: Error "JWT_SECRET must be at least 32 characters"</b></summary>

**A:** Generate JWT secret yang lebih panjang:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy hasilnya ke `.env` file.
</details>

<details>
<summary><b>Q: "ECONNREFUSED" error saat connect ke database</b></summary>

**A:** Pastikan:
1. PostgreSQL sudah running: `pg_isready`
2. Credentials di `.env` benar
3. Database sudah dibuat: `psql -U postgres -l`
4. Port 5432 tidak diblok firewall
</details>

<details>
<summary><b>Q: Migration failed atau table tidak terbuat</b></summary>

**A:** Jalankan migrations secara berurutan:
```bash
node scripts/run-migration.js
node scripts/run-reminder-migration.js
node scripts/run-routine-migration.js
node scripts/verify-tables.js
```
Jika masih error, cek log error dan pastikan user punya permission CREATE TABLE.
</details>

<details>
<summary><b>Q: Telegram bot tidak merespon</b></summary>

**A:** 
1. Cek `TELEGRAM_BOT_TOKEN` di `.env` sudah benar
2. Restart server
3. Cek log: harus ada "🤖 Telegram bot initialized successfully"
4. Test bot dengan `/start` di Telegram
5. Pastikan tidak ada duplikat bot running (stop server lain)
</details>

### Development Issues

<details>
<summary><b>Q: Port 4000 sudah digunakan</b></summary>

**A:** 
- Ubah `PORT` di `.env` ke port lain (misal 3000)
- Atau kill process di port 4000:
  ```bash
  # Windows
  netstat -ano | findstr :4000
  taskkill /PID <PID> /F
  
  # Linux/Mac
  lsof -ti:4000 | xargs kill -9
  ```
</details>

<details>
<summary><b>Q: "Cannot find module" error</b></summary>

**A:**
```bash
# Clear cache dan reinstall
rm -rf node_modules package-lock.json
npm install
```
</details>

<details>
<summary><b>Q: Nodemon tidak tersedia</b></summary>

**A:** Install nodemon globally:
```bash
npm install -g nodemon
```
Atau gunakan langsung: `npm start`
</details>

### API & Authentication

<details>
<summary><b>Q: "Token invalid" atau "Unauthorized"</b></summary>

**A:**
1. Pastikan format header benar: `Authorization: Bearer <token>`
2. Token mungkin expired (login ulang)
3. JWT_SECRET berbeda antara login dan verify
4. Cek token tidak ada spasi atau karakter extra
</details>

<details>
<summary><b>Q: CORS error dari frontend</b></summary>

**A:** CORS sudah enabled di `app.js`. Jika masih error:
```javascript
// Update cors config di app.js
app.use(cors({
  origin: ['http://localhost:3000', 'your-frontend-url'],
  credentials: true
}));
```
</details>

### Database Issues

<details>
<summary><b>Q: "relation does not exist" error</b></summary>

**A:** Table belum dibuat. Run migrations:
```bash
node scripts/run-migration.js
```
</details>

<details>
<summary><b>Q: Cara reset database dari awal</b></summary>

**A:**
```bash
# Drop semua tables
psql -U postgres -d task_api_db -f clear_database.sql

# Atau drop & recreate database
psql -U postgres -c "DROP DATABASE task_api_db;"
psql -U postgres -c "CREATE DATABASE task_api_db;"

# Run migrations ulang
node scripts/run-migration.js
node scripts/run-reminder-migration.js
node scripts/run-routine-migration.js
```
</details>

### Performance & Monitoring

<details>
<summary><b>Q: Cara monitoring scheduler jobs</b></summary>

**A:**
```bash
# Check scheduler status
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/routines/scheduler/status
```
Atau cek log server saat scheduler running.
</details>

<details>
<summary><b>Q: Reminder tidak terkirim</b></summary>

**A:**
1. Pastikan scheduler running (cek log)
2. Cek timezone setting (Asia/Jakarta)
3. Verifikasi user punya reminder aktif di database
4. Test manual send reminder via API
</details>

---

## 👥 Untuk Team Development

### Git Workflow

```bash
# 1. Pull latest changes
git pull origin main

# 2. Buat branch untuk feature baru
git checkout -b feature/nama-fitur

# 3. Setelah development selesai
git add .
git commit -m "feat: deskripsi fitur"
git push origin feature/nama-fitur

# 4. Buat Pull Request di GitHub/GitLab
```

### Code Review Checklist

- [ ] Code mengikuti style guide project
- [ ] Tidak ada credentials atau secrets di code
- [ ] API endpoint ter-dokumentasi di Swagger
- [ ] Error handling sudah proper
- [ ] Test manual sudah dilakukan
- [ ] Migration script (jika ada perubahan database)

### Kontak & Support

Jika menemui masalah yang tidak ada di dokumentasi:
1. Cek existing issues di repository
2. Tanya di group chat team
3. Buat issue baru dengan detail error & steps to reproduce

---

## 🔒 Security Notes (PENTING!)

⚠️ **Jangan pernah commit file `.env` ke repository!**

- File `.env` sudah ada di `.gitignore`
- Gunakan `.env.example` sebagai template
- Share credentials via secure channel (tidak via chat/email)
- Rotate JWT_SECRET dan database password secara berkala
- Gunakan strong password untuk production

---

## 📚 Additional Resources

- **Swagger Docs**: http://localhost:4000/api-docs (saat server running)
- **Dokumentasi Detail**: Lihat folder `docs/` untuk guide spesifik
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Express.js**: https://expressjs.com/

---

## Troubleshooting (Legacy)

### Common Issues
- **Port sudah dipakai** → Ubah PORT di .env
- **Token tidak diterima** → Pastikan header `Authorization: Bearer <token>` benar
- **Database connection failed** → Cek DB credentials di .env
- **Telegram bot tidak merespon** → Verifikasi TELEGRAM_BOT_TOKEN
- **Routine generation failed** → Cek apakah routine memiliki tasks aktif
- **Transaction creation failed** → Pastikan amount > 0 dan type valid (income/expense) ✨

### Telegram Bot Issues
- **Bot tidak start** → Pastikan TELEGRAM_BOT_TOKEN valid
- **Commands tidak muncul** → Restart server setelah mengubah token
- **Button tidak bekerja** → Cek callback query handlers di telegramService.js
- **Transaction commands not working** → Pastikan transactionService.js ter-import dengan benar ✨

### Database Issues
- **Migration failed** → Jalankan migration scripts secara berurutan
- **Missing tables** → Cek apakah semua migration sudah dijalankan
- **Transaction table missing** → Jalankan migration add_transactions_table.sql ✨
- **Connection timeout** → Verifikasi DB_HOST, DB_PORT, dan credentials

### Scheduler Issues
- **Reminders tidak dikirim** → Cek timezone settings (Asia/Jakarta)
- **Routine tidak generate** → Pastikan ada active routines dengan tasks
- **Duplicate notifications** → Cek scheduler job configurations

### Debug Mode
```bash
# Enable detailed logging
NODE_ENV=development npm start

# Or with nodemon for auto-reload
NODE_ENV=development nodemon app.js

# Check scheduler status (requires authentication)
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/routines/scheduler/status
```

## Swagger (OpenAPI) Documentation

Aplikasi sudah menyediakan dokumentasi OpenAPI yang dapat diakses pada:
```
http://localhost:<PORT>/api-docs
```
Default PORT diambil dari `process.env.PORT` atau `4000`.

### Install dependensi (jika belum)
```bash
npm install swagger-jsdoc swagger-ui-express
```

### File konfigurasi
Pastikan ada file `swagger.js` di root project (contoh disertakan di bawah). app.js sudah mengimpor:
```js
import { swaggerUi, swaggerSpec } from "./swagger.js";
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

### Cara kerja
- `swagger-jsdoc` membaca komentar JSDoc/Swagger di file dalam `routes/` (aturan `apis` di swagger.js).
- Annotate route dengan block `@swagger` (sudah ada di beberapa `routes/*.js`).
- Komponen security `bearerAuth` diset untuk JWT; endpoint yang protected harus menambahkan:
  ```yaml
  security:
    - bearerAuth: []
  ```
  dan client harus menggunakan header:
  ```
  Authorization: Bearer <token>
  ```

### Contoh anotasi singkat (gunakan di atas route handler di file routes/*.js)
```yaml
/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login dan mendapatkan token JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login sukses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 */
```

## Contoh akses
1. Jalankan server:
```bash
npm start
```
2. Buka:
```
http://localhost:4000/api-docs
```

### Tips
- Jika dokumentasi tidak menampilkan semua route, pastikan `apis` pattern di `swagger.js` sesuai (mis. `./routes/*.js`).
- Untuk menampilkan contoh request/response lebih lengkap, tambahkan `components/schemas` di `swagger.js` atau pada anotasi route.
- Perbarui `servers` di `swagger.js` jika menjalankan di environment selain localhost.