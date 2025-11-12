# 🚀 Quick Start - Telegram Bot Task Management

Panduan singkat untuk menggunakan Telegram Bot dengan fitur optimasi CRUD terbaru.

---

## 📱 Perintah Utama

### **`/quick` - Menu Cepat** ⚡
Akses cepat ke semua fitur dengan statistik real-time.

```
/quick
```

**Fitur:**
- Lihat statistik task (Pending, In Progress, Done)
- Tombol akses cepat: Add Task, My Tasks, Complete Task, Templates, dll

---

### **`/mytasks` - Daftar Task Interaktif** 📋
Lihat semua task aktif dengan tombol aksi di setiap task.

```
/mytasks
```

**Setiap task punya tombol:**
- ✅ **Done** - Tandai selesai langsung
- ✏️ **Edit** - Edit task details
- 🗑️ **Delete** - Hapus task (dengan konfirmasi)

**Contoh tampilan:**
```
📋 My Active Tasks (5)

🔄 🔴 💼 Project Meeting
Weekly team sync
📊 high | 📁 work | ⏰ 09:00-10:00
[✅ Done] [✏️ Edit] [🗑️ Delete]

📋 🟡 📚 Study Python
Learn advanced concepts
📊 medium | 📁 learn | ⏰ 14:00-16:00
[✅ Done] [✏️ Edit] [🗑️ Delete]
```

---

### **`/complete` - Cepat Tandai Selesai** ✅
Cara tercepat untuk menyelesaikan task.

```
/complete
```

Bot akan tampilkan daftar task, klik yang mau diselesaikan!

---

### **`/addtask` - Tambah Task Baru** ➕
Format sederhana untuk menambah task:

```
Title | Description | Priority | Category | TimeStart | TimeEnd
```

**Contoh:**
```
Meeting | Weekly sync | high | work | 14:00 | 15:00
```

**Field yang wajib:**
- Title (judul task)
- TimeStart (format HH:MM)

**Nilai valid:**
- Priority: `high`, `medium`, `low`
- Category: `work`, `learn`, `rest`

---

### **`/today` - Task Hari Ini** 📅
Lihat semua task hari ini, dikelompokkan berdasarkan status.

```
/today
```

---

## 🎨 Task Templates

Gunakan template siap pakai untuk task umum!

**Cara akses:**
1. Ketik `/quick`
2. Klik "📊 Task Templates"
3. Pilih template yang diinginkan

**Template tersedia:**
- 👥 Meeting (1 jam)
- 📚 Study Session (2 jam)
- 💪 Workout (1 jam)
- ☕ Break (15 menit)
- 🍽️ Meal Time (30 menit)
- 📝 Daily Review (30 menit)

Template otomatis isi waktu sesuai durasi!

---

## 🔄 Routine Templates

### **`/myroutines` - Lihat Routine** 🗓️
Lihat semua routine template yang sudah dibuat.

```
/myroutines
```

**Tombol aksi:**
- 🔄 Generate All Routines - Generate semua routine sekaligus

---

### **Generate Routine**
Klik tombol "🔄 Generate All Routines" untuk otomatis membuat task dari semua routine aktif.

---

## 🔧 Edit & Delete Task

### **Edit Task** ✏️
**2 cara:**

**Cara 1 - Dari /mytasks:**
1. Ketik `/mytasks`
2. Klik tombol ✏️ Edit pada task yang mau diedit
3. Kirim format edit

**Cara 2 - Direct command:**
```
/edittask <task-id>
```

**Format edit:**
```
Title | Description | Priority | Category | TimeStart | TimeEnd | Status
```

**Status valid:** `pending`, `in_progress`, `done`

---

### **Delete Task** 🗑️
**2 cara:**

**Cara 1 - Dari /mytasks (Recommended):**
1. Ketik `/mytasks`
2. Klik tombol 🗑️ Delete pada task yang mau dihapus
3. Konfirmasi dengan klik "✅ Yes, Delete"

**Cara 2 - Direct command:**
```
/deletetask
```
Bot akan tampilkan daftar task, pilih yang mau dihapus.

---

## 🔐 Setup Awal

### **1. Hubungkan Akun**
```
/login
```
- Masukkan email
- Masukkan password
- Bot akan verifikasi dan sambungkan akun

### **2. Cek Status**
```
/status
```
Lihat status koneksi dan info akun.

---

## 💡 Tips & Trik

### **Workflow Cepat**
1. Pagi: `/quick` → Lihat statistik hari ini
2. Tambah task: `/quick` → Klik "Add Task" atau gunakan template
3. Kelola task: `/mytasks` → Gunakan inline buttons
4. Selesaikan task: Langsung klik ✅ Done dari `/mytasks`
5. Malam: `/complete` → Tandai semua task selesai

### **Shortcuts**
- **Quick add:** `/quick` → Add Task → Paste format
- **Quick complete:** `/complete` → Klik task
- **Bulk complete:** Buka `/mytasks`, klik ✅ satu per satu
- **Use templates:** `/quick` → Templates → Pilih & kirim

### **Best Practices**
✅ Selalu isi `TimeStart` untuk aktifkan reminder  
✅ Gunakan priority sesuai kepentingan  
✅ Gunakan template untuk save time  
✅ Review task dengan `/today` setiap pagi  
✅ Complete task segera setelah selesai  

---

## 🎯 Use Cases

### **Scenario 1: Meeting Mendadak**
```
1. /quick
2. Klik "Task Templates"
3. Pilih "👥 Meeting"
4. Customize jika perlu, kirim
5. Done! Task + reminder tereset
```

### **Scenario 2: Bulk Complete Task**
```
1. /mytasks
2. Klik ✅ Done pada task pertama
3. Klik ✅ Done pada task kedua
4. Dst...
5. Semua selesai dalam hitungan detik!
```

### **Scenario 3: Edit Task Cepat**
```
1. /mytasks
2. Klik ✏️ Edit pada task
3. Kirim: Same Title | Same Desc | high | work | 16:00 | 17:00 | in_progress
4. Task updated + reminder rescheduled!
```

---

## 📋 Command Reference

| Command | Deskripsi | Contoh |
|---------|-----------|--------|
| `/start` | Mulai bot | `/start` |
| `/login` | Hubungkan akun | `/login` |
| `/verify` | Verifikasi OTP | `/verify` |
| `/quick` | Menu cepat | `/quick` |
| `/addtask` | Tambah task | `/addtask` |
| `/mytasks` | List task + actions | `/mytasks` |
| `/complete` | Tandai selesai | `/complete` |
| `/today` | Task hari ini | `/today` |
| `/myroutines` | Lihat routines | `/myroutines` |
| `/status` | Status koneksi | `/status` |
| `/menu` | Lihat semua command | `/menu` |
| `/cancel` | Batal operasi | `/cancel` |

---

## 🆘 Troubleshooting

### **"Not Connected"**
- Ketik `/login` untuk hubungkan akun
- Atau `/verify` jika sudah pernah login

### **"Task not found"**
- Task mungkin sudah dihapus
- Gunakan `/mytasks` untuk lihat task yang ada

### **"Invalid time format"**
- Gunakan format HH:MM (24-hour)
- Contoh: `09:00`, `14:30`, `23:59`

### **"Invalid category/priority"**
- Priority: `high`, `medium`, `low` (lowercase)
- Category: `work`, `learn`, `rest` (lowercase)

### **Bot tidak respon**
- Tunggu beberapa detik
- Coba command lagi
- Jika masih error, hubungi admin

---

## 📞 Support

Jika ada masalah atau pertanyaan:
1. Ketik `/help` untuk info lengkap
2. Ketik `/menu` untuk lihat semua command
3. Hubungi admin jika ada bug

---

**Selamat menggunakan! 🎉**

Kelola task jadi lebih mudah dan cepat dengan Telegram Bot! 🚀
