# Telegram Task Management Guide

## Overview
Fitur manajemen task melalui Telegram Bot memungkinkan user untuk menambahkan task baru dan melihat task hari ini langsung dari Telegram tanpa perlu membuka aplikasi.

## New Commands

### 1. `/addtask` - Add New Task

#### Description
Command untuk menambahkan task baru melalui Telegram.

#### Usage
1. Ketik `/addtask`
2. Bot akan menampilkan format input
3. User mengirim task details dengan format:
   ```
   Title | Description | Priority | Category | TimeStart | TimeEnd
   ```

#### Format Details
- **Title** (required): Judul task
- **Description** (optional): Deskripsi task
- **Priority** (optional): `high`, `medium`, `low` (default: `medium`)
- **Category** (optional): `work`, `learn`, `rest` (default: `work`)
- **TimeStart** (required): Waktu mulai dalam format HH:MM (24-hour)
- **TimeEnd** (optional): Waktu selesai dalam format HH:MM (24-hour)

#### Examples

**Complete format:**
```
Team Meeting | Discuss Q4 goals | high | work | 09:00 | 10:00
Study Python | Complete chapter 5 | medium | learn | 14:30 | 16:00
Meditation | Morning routine | low | rest | 06:00 | 06:30
```

**With minimal fields (skip description, use defaults):**
```
Team Meeting | | | | 09:00 | 10:00
Study Python | | medium | learn | 14:30 | 16:00
```

**Direct command format:**
```
/addtask Meeting | Discuss goals | high | work | 09:00 | 10:00
```

#### Response
Bot akan mengirim konfirmasi dengan detail task yang telah dibuat:
- ✅ Success message
- Task title dengan emoji berdasarkan category
- Description (jika ada)
- Priority dengan emoji warna
- Category
- Time start dan end
- Status (default: Pending)
- Confirmation bahwa reminders telah dijadwalkan
- Inline buttons untuk add another task atau view today's tasks

### 2. `/today` - View Today's Tasks

#### Description
Command untuk melihat semua task yang dijadwalkan untuk hari ini.

#### Usage
Ketik `/today`

#### Features
- Menampilkan task yang dibuat hari ini
- Menampilkan task dengan due date hari ini
- Menampilkan task pending yang belum selesai
- Task dikelompokkan berdasarkan status:
  - 📋 Pending Tasks
  - 🔄 In Progress
  - ✅ Completed

#### Task Display Format
Setiap task ditampilkan dengan:
- Priority emoji (🔴 High, 🟡 Medium, 🟢 Low)
- Category emoji (💼 Work, 📚 Learn, 🏃 Health, 🔄 Routine, 📝 Personal)
- Task title
- Time start (jika ada)
- Description preview (50 karakter pertama)

#### Task Sorting
Tasks diurutkan berdasarkan:
1. Priority (High → Medium → Low)
2. Time start (ascending)
3. Created date (descending)

#### Response
Bot akan menampilkan:
- 📊 Overview: jumlah task per status
- 📋 List of pending tasks
- 🔄 List of in-progress tasks
- ✅ List of completed tasks
- Inline buttons untuk add task atau refresh

#### Empty State
Jika tidak ada task:
```
📅 Today's Tasks

🎉 No tasks for today!

Use /addtask to create a new task.
```

## UI Features

### Inline Keyboards
Kedua command dilengkapi dengan inline keyboard untuk quick actions:

**After adding task:**
- ➕ Add Another Task
- 📅 View Today's Tasks

**After viewing tasks:**
- ➕ Add Task
- 🔄 Refresh

### Callback Handlers
- `cmd_addtask`: Trigger `/addtask` command
- `cmd_today`: Trigger `/today` command

## Integration with Existing Features

### Menu Command
Command `/menu` telah diupdate untuk menampilkan tombol:
- ➕ Add Task
- 📅 Today's Tasks

### Help Command
Command `/help` telah diupdate dengan dokumentasi:
- Task Management section
- Add Task usage guide
- View Today's Tasks usage guide

### Start Command
Welcome message di `/start` telah diupdate dengan info:
- Add tasks dengan `/addtask`
- View today's tasks dengan `/today`
- Inline buttons untuk quick access

## Security & Authentication

### Verification Required
Kedua command membutuhkan:
- User harus terverifikasi (linked dengan account LifePath)
- Telegram chat_id harus terdaftar di `user_telegram_config`
- `is_verified` = true

### Error Handling
Jika user belum terverifikasi:
```
❌ Not Connected

Please connect your Telegram account first using /verify or /login
```

## Database Operations

### Add Task
```sql
INSERT INTO tasks (
  id, user_id, title, description, 
  status, priority, category, 
  created_at, updated_at
)
VALUES (...)
RETURNING *
```

### Get Today's Tasks
```sql
SELECT * FROM tasks
WHERE user_id = $1
AND (
  DATE(created_at) = $2
  OR DATE(due_date) = $2
  OR (due_date IS NULL AND status != 'done')
)
ORDER BY 
  CASE priority
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
  END,
  time_start ASC,
  created_at DESC
```

## Input Validation

### Task Title
- Required field
- Diambil dari part pertama (sebelum `|`)
- Error jika kosong

### Time Start
- Required field untuk enable reminders
- Format: HH:MM (24-hour format)
- Validasi regex: `/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/`
- Error jika tidak valid atau kosong

### Time End
- Optional field
- Format: HH:MM (24-hour format)
- Validasi regex: `/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/`
- Akan di-set null jika tidak valid

### Priority
- Valid values: `high`, `medium`, `low`
- Case insensitive
- Default: `medium`
- Invalid values akan di-set ke default

### Category
- Valid values: `work`, `learn`, `rest`
- Case insensitive
- Default: `work`
- Invalid values akan di-set ke default

## User Experience Features

### One-time Message Handlers
- `/addtask` menggunakan one-time message handler
- Handler otomatis di-remove setelah task dibuat
- Menghindari konflik dengan command lain

### Auto-cleanup
- Handler di-remove jika user mengirim command lain (`/...`)
- Mencegah task creation yang tidak diinginkan

### Rich Formatting
- Markdown formatting untuk emphasis
- Emoji untuk visual cues
- Clear structure dengan sections

### Interactive Buttons
- Quick access ke related commands
- Reduce typing untuk common actions
- Better user engagement

## Testing Guide

### Test Add Task

1. **Complete format:**
   ```
   /addtask
   Team Meeting | Discuss Q4 goals | high | work | 09:00 | 10:00
   ```

2. **With minimal fields:**
   ```
   /addtask
   Study Session | | medium | learn | 14:30 | 16:00
   ```

3. **Direct command:**
   ```
   /addtask Morning Exercise | Cardio workout | low | rest | 06:00 | 07:00
   ```

4. **Without time (should show error):**
   ```
   /addtask
   Test Task | Description | high | work
   ```

5. **Invalid time format (should show error):**
   ```
   /addtask
   Test Task | Description | high | work | 25:00 | 10:00
   ```

### Test Today's Tasks

1. **View empty state:**
   ```
   /today
   (when no tasks exist)
   ```

2. **View with tasks:**
   ```
   /today
   (after adding some tasks)
   ```

3. **View with mixed status:**
   - Create pending tasks
   - Create completed tasks
   - Run `/today`

4. **Test inline buttons:**
   - Click "Add Task" button
   - Click "Refresh" button

### Test Integration

1. **From /menu:**
   - Run `/menu`
   - Click "Add Task" button
   - Click "Today's Tasks" button

2. **From /start:**
   - Run `/start`
   - Click "Add Task" button
   - Click "Today's Tasks" button

3. **After adding task:**
   - Run `/addtask`
   - Add a task
   - Click "View Today's Tasks" button

## Error Scenarios

### Not Verified
```
/addtask
→ ❌ Not Connected
```

### Empty Title
```
/addtask
| | high | work | 09:00 | 10:00
→ ❌ Task title is required!
```

### Missing Time Start
```
/addtask
Team Meeting | Discuss goals | high | work
→ ⚠️ Time Start Required for Reminders
```

### Invalid Time Format
```
/addtask
Team Meeting | Discuss goals | high | work | 25:99 | 10:00
→ ⚠️ Time Start Required for Reminders
```

### Database Error
```
/addtask
Valid Input
→ ❌ Failed to create task. Please try again.
```

## Future Enhancements

Potential improvements:
1. ✏️ Edit task command
2. ✅ Mark task as done from Telegram
3. 🗑️ Delete task command
4. 📊 Task statistics
5. 🔍 Search tasks
6. 📆 View tasks by date range
7. 🏷️ Filter by category
8. ⏰ Set time for tasks directly
9. 📝 Update task details
10. 🔔 Snooze reminders

## Command Summary Table

| Command | Description | Requires Auth | Parameters |
|---------|-------------|---------------|------------|
| `/addtask` | Add new task | ✅ Yes | Interactive input |
| `/today` | View today's tasks | ✅ Yes | None |

## Emoji Reference

### Priority
- 🔴 High
- 🟡 Medium
- 🟢 Low

### Category
- 💼 Work
- 📚 Learn
- 🧘 Rest

### Status
- 📋 Pending
- 🔄 In Progress
- ✅ Completed

---

*Last Updated: November 10, 2025*
