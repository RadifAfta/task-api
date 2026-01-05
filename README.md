# Task API

Advanced Task Management API with REST endpoints, Telegram Bot integration, Routine Management, and Smart Reminders.

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

## Prasyarat
- Node.js >= 16
- npm atau pnpm/yarn
- PostgreSQL database
- Telegram Bot Token (untuk bot features)

## Prasyarat
- Node.js >= 16
- npm atau pnpm/yarn
- (Opsional) database / service jika controller menggunakan DB (sesuaikan .env)

## Setup

1. Clone repository dan masuk ke folder:
   ```bash
   git clone <repo-url>
   cd e:\SUKSES-BACKEND\task-api
   ```

2. Install dependensi:
   ```bash
   npm install
   ```

3. Setup database PostgreSQL dan buat database baru

4. Buat file .env di root (contoh lengkap):
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your_jwt_secret_here_min_32_chars

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=task_api_db
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password

   # Telegram Bot Configuration
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

   # Email Configuration (untuk notifications)
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password

   # Optional: Redis untuk caching (future feature)
   REDIS_URL=redis://localhost:6379

   # Optional: External API keys
   OPENAI_API_KEY=your_openai_key_for_future_ai_features
   ```

### Environment Variables Details

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `JWT_SECRET` | Yes | - | JWT signing secret (min 32 chars) |
| `DB_HOST` | Yes | - | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_NAME` | Yes | - | Database name |
| `DB_USER` | Yes | - | Database user |
| `DB_PASSWORD` | Yes | - | Database password |
| `TELEGRAM_BOT_TOKEN` | Yes* | - | Telegram bot token (*required for bot features) |
| `EMAIL_USER` | No | - | Email for notifications |
| `EMAIL_PASS` | No | - | Email app password |

*Telegram bot features akan disabled jika token tidak disediakan.

5. Setup database schema:
   ```bash
   # Jalankan migration scripts
   node scripts/run-migration.js
   ```

6. Jalankan server:
   - Production:
     ```bash
     npm start
     ```
   - Development:
     ```bash
     npm run dev
     ```

Default server berjalan di: `http://localhost:3000/`
Swagger docs: `http://localhost:3000/api-docs`

## Struktur Project

```
├── app.js                    # Entry point aplikasi
├── swagger.js               # OpenAPI/Swagger configuration
├── config/
│   └── db.js               # Database connection
├── controllers/
│   ├── adminController.js  # Admin operations
│   ├── authController.js   # Authentication logic
│   ├── reminderController.js # Reminder management
│   ├── routineController.js # Routine management
│   ├── taskController.js   # Task CRUD operations
│   ├── telegramController.js # Telegram bot operations
│   ├── transactionController.js # Transaction management ✨
├── docs/                   # Documentation files
├── middlewares/
│   ├── authMiddleware.js   # JWT verification
│   ├── customErrorMiddleware.js # Error handling
│   ├── roleMiddleware.js   # Role-based access
│   └── validationMiddleware.js # Input validation
├── migrations/            # Database migration scripts
├── models/
│   ├── reminderModel.js   # Reminder data models
│   ├── routineModel.js    # Routine data models
│   └── taskModel.js       # Task data models
│   ├── transactionModel.js # Transaction data models ✨
│   ├── userModel.js       # User data models
├── public/               # Static files
├── routes/
│   ├── adminRoute.js     # Admin endpoints
│   ├── authRoute.js      # Auth endpoints
│   ├── index.js          # Main router
│   ├── reminderRoute.js  # Reminder endpoints
│   ├── routineRoute.js   # Routine endpoints
│   ├── taskRoute.js      # Task endpoints
│   ├── telegramRoute.js  # Telegram bot endpoints
│   └── transactionRoute.js # Transaction endpoints ✨
├── scripts/             # Utility scripts
├── services/
│   ├── reminderService.js # Reminder business logic
│   ├── routineService.js  # Routine generation logic
│   ├── schedulerService.js # Task scheduling
│   ├── taskService.js     # Task CRUD operations
│   ├── telegramService.js # Telegram bot logic ✨
│   ├── transactionService.js # Transaction management ✨
│   └── userService.js     # User management
├── utils/
│   └── pagination.js    # Pagination utilities
└── README.md
```

## API Endpoints

Base URL: `http://localhost:3000/api`

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login (returns JWT token)
- `POST /auth/verify-telegram` - Verify Telegram account

### Tasks (Protected - Requires Bearer Token)
- `GET /tasks` - Get all user tasks (with pagination)
- `POST /tasks` - Create new task
- `GET /tasks/:id` - Get task by ID
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `POST /tasks/:id/complete` - Mark task as completed

### Routines (Protected - Requires Bearer Token)
- `GET /routines` - Get all user routines
- `POST /routines` - Create new routine template
- `GET /routines/:id` - Get routine by ID
- `PUT /routines/:id` - Update routine
- `DELETE /routines/:id` - Delete routine
- `POST /routines/generate/:id` - Generate tasks from routine ✨

### Reminders (Protected - Requires Bearer Token)
- `GET /reminders` - Get user reminders
- `POST /reminders` - Create reminder
- `PUT /reminders/:id` - Update reminder
- `DELETE /reminders/:id` - Delete reminder

### Transactions (Protected - Requires Bearer Token) ✨
- `GET /transactions` - Get all user transactions (with pagination)
- `POST /transactions` - Create new transaction (income/expense)
- `GET /transactions/:id` - Get transaction by ID
- `PUT /transactions/:id` - Update transaction
- `DELETE /transactions/:id` - Delete transaction
- `GET /transactions/summary` - Get financial summary and analytics

### Admin (Admin Only - Requires Bearer Token)
- `GET /admin/users` - List all users
- `GET /admin/stats` - System statistics
- `POST /admin/cleanup` - Run cleanup tasks

### System
- `GET /health` - Health check
- `GET /scheduler/status` - Scheduler status

### Headers Required
All protected endpoints require:
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

### Example Request
```bash
# Create task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "title": "Complete project",
    "description": "Finish the task management system",
    "priority": "high",
    "category": "work",
    "time_start": "09:00",
    "time_end": "17:00"
  }'

# Create transaction (income)
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "type": "income",
    "amount": 5000000,
    "category": "salary",
    "description": "Monthly salary"
  }'

# Get financial summary
curl -X GET "http://localhost:3000/api/transactions/summary?dateFrom=2024-01-01&dateTo=2024-12-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 🤖 Telegram Bot Commands ✨

Bot tersedia dengan command-command interaktif untuk kemudahan penggunaan:

### Setup Bot
1. Dapatkan Bot Token dari [@BotFather](https://t.me/botfather) di Telegram
2. Set `TELEGRAM_BOT_TOKEN` di file .env
3. Bot akan otomatis start saat server berjalan

### Available Commands
```
/start - Start bot dan tampilkan welcome message
/menu - Tampilkan menu command dengan button interaktif ✨
/help - Bantuan dan dokumentasi lengkap

# Authentication
/login <email> - Login dengan email
/verify <code> - Verifikasi akun dengan kode dari app

# Task Management
/addtask - Tambah task baru (interactive)
/quickadd - Quick add task
/today - Lihat task hari ini
/mytasks - Kelola semua task

# Routine Management ✨
/addroutine - Buat routine template baru
/myroutines - Lihat & kelola routine templates ✨
/generateroutine - Generate daily routine ✨

# Financial Management ✨
/transactions - View all transactions 💰
/transactions_today - View today's transactions 📅
/transaction_summary - Financial summary 📊

# Status & Info
/status - Cek status koneksi
```

### ✨ Recent Updates (January 2026)
- **Financial Management System**: Complete income/expense tracking with analytics ✨
- **Transaction Commands**: New Telegram commands for financial management
- **Enhanced Routine Management**: UI yang lebih informatif dengan detail lengkap
- **Auto-Generate Feature**: Opsi generate routine langsung setelah pembuatan
- **Interactive Buttons**: Semua command menggunakan button untuk kemudahan
- **Better Error Handling**: Pesan error yang lebih jelas dan helpful
- **Smart Reminders**: Sistem reminder otomatis untuk task

### Bot Features
- ✅ Interactive command menu
- ✅ Real-time notifications
- ✅ Button-based navigation
- ✅ Smart task categorization
- ✅ Routine template management
- ✅ Financial transaction tracking ✨
- ✅ Automated reminders
- ✅ Daily summaries

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

## Contoh dengan curl

Register:
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
    "dev": "nodemon app.js",
    "test": "echo \"no tests\" && exit 0",
    "migrate": "node scripts/run-migration.js",
    "seed": "node scripts/seed-database.js"
  }
}
```

### Migration Commands
```bash
# Run all migrations
npm run migrate

# Create new migration
node scripts/create-migration.js <migration-name>

# Rollback last migration
node scripts/rollback-migration.js
```

### Development Commands
```bash
# Start with auto-reload
npm run dev

# Start production server
npm start

# Check syntax
node -c app.js
node -c services/telegramService.js
```

## Contribution
- Fork repo, buat branch per fitur/bugfix, buat PR.
- Sertakan deskripsi perubahan dan cara menguji.

## License
Tambahkan lisensi sesuai kebutuhan (mis. MIT).

## Troubleshooting

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
NODE_ENV=development npm run dev

# Check scheduler status
curl http://localhost:3000/api/scheduler/status
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
npm run dev
```
2. Buka:
```
http://localhost:3000/api-docs
```

### Tips
- Jika dokumentasi tidak menampilkan semua route, pastikan `apis` pattern di `swagger.js` sesuai (mis. `./routes/*.js`).
- Untuk menampilkan contoh request/response lebih lengkap, tambahkan `components/schemas` di `swagger.js` atau pada anotasi route.
- Perbarui `servers` di `swagger.js` jika menjalankan di environment selain localhost.