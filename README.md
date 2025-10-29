# Task API

Simple RESTful Task API with authentication (register / login) and task CRUD endpoints.

## Fitur
- Register & Login (JWT)
- Middleware verifikasi token untuk protected routes
- CRUD untuk Tasks (create, read, update, delete)
- Struktur modular (routes, controllers, middlewares)

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

3. Buat file .env di root (contoh):
   ```env
   PORT=4000
   NODE_ENV=development
   JWT_SECRET=your_jwt_secret_here
   # DATABASE_URL=...
   ```

4. Jalankan server:
   - Production:
     ```bash
     npm start
     ```
   - Development (jika pakai nodemon):
     ```bash
     npm run dev
     ```

Default server berjalan di: `http://localhost:4000/`

## Struktur Project (ringkasan)
- app.js — entry aplikasi, middleware, register routes
- routes/
  - index.js — main router (`/api`)
  - authRoute.js — `/api/auth` (register, login)
  - taskRoute.js — `/api/tasks` (protected)
- controllers/ — logic untuk auth & task (register/login, task CRUD)
- middlewares/ — middleware (contoh: verifyToken)
- models/ — (opsional) model DB
- README.md — dokumentasi

## Endpoint Utama

Base URL: `http://localhost:4000/api`

Auth
- POST /auth/register
  - Body (JSON): `{ "username": "user", "email": "a@b.com", "password": "pass" }`
- POST /auth/login
  - Body (JSON): `{ "email": "a@b.com", "password": "pass" }`
  - Response biasanya berisi token JWT: `{ "token": "..." }`

Tasks (semua route protected — sertakan header Authorization Bearer)
- POST /tasks
  - Buat task. Body contoh:
    ```json
    { "title": "Tugas", "description": "Deskripsi", "dueDate": "2025-12-31" }
    ```
- GET /tasks
  - Ambil semua task untuk user
- GET /tasks/:id
  - Ambil task by id
- PUT /tasks/:id
  - Update task
- DELETE /tasks/:id
  - Hapus task

Header Authorization:
```
Authorization: Bearer <token>
```

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

## Scripts yang disarankan (package.json)
```json
{
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "test": "echo \"no tests\" && exit 0"
  }
}
```

## Contribution
- Fork repo, buat branch per fitur/bugfix, buat PR.
- Sertakan deskripsi perubahan dan cara menguji.

## License
Tambahkan lisensi sesuai kebutuhan (mis. MIT).

## Troubleshooting cepat
- Port sudah dipakai -> ubah PORT di .env
- Token tidak diterima -> pastikan header `Authorization: Bearer <token>` benar dan JWT_SECRET sama di server
- Missing dependencies -> jalankan `npm install`

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

### Tips
- Jika dokumentasi tidak menampilkan semua route, pastikan `apis` pattern di `swagger.js` sesuai (mis. `./routes/*.js`).
- Untuk menampilkan contoh request/response lebih lengkap, tambahkan `components/schemas` di `swagger.js` atau pada anotasi route.
- Perbarui `servers` di `swagger.js` jika menjalankan di environment selain localhost.

## Contoh akses
1. Jalankan server:
```bash
npm run dev
```
2. Buka:
```
http://localhost:4000/api-docs
```