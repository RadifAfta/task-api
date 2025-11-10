# Telegram Task Edit & Delete Guide

## Overview
Fitur untuk mengedit dan menghapus task yang sudah dibuat melalui Telegram bot.

---

## 1. Edit Task - `/edittask`

### Usage

**Without Task ID:**
```
/edittask
```
Bot akan menampilkan daftar task aktif (non-completed) dengan ID masing-masing.

**With Task ID:**
```
/edittask <task-id>
```
Bot akan meminta input untuk update task tersebut.

### Edit Format

```
Title | Description | Priority | Category | TimeStart | TimeEnd | Status
```

### Examples

**Edit All Fields:**
```
Updated Meeting | New agenda | high | work | 10:00 | 11:00 | in_progress
```

**Edit Specific Fields (keep others):**
```
New Title | | | | | | 
```
Hanya update title, field lainnya tetap sama.

```
| New description | high | | | | 
```
Update description dan priority saja.

```
| | | | | | done
```
Hanya ubah status menjadi done (mark as completed).

### Field Details

- **Title**: Task name (required, cannot be empty)
- **Description**: Task details (optional)
- **Priority**: high/medium/low (default: current value)
- **Category**: work/learn/rest (default: current value)
- **TimeStart**: Start time HH:MM (default: current value)
- **TimeEnd**: End time HH:MM (default: current value)
- **Status**: pending/in_progress/done (default: current value)

### Features

✅ Shows current task values before editing
✅ Keeps existing values for empty fields
✅ Validates all input fields
✅ Automatically reschedules reminders if time changes
✅ Deletes reminders if status changed to 'done'
✅ Shows summary of changes made
✅ Inline buttons for quick actions

### Workflow Example

1. **List Tasks:**
```
/edittask
```

Bot shows:
```
✏️ Edit Task

Recent Active Tasks:

1. 🔴 💼 Team Meeting ⏰ 09:00
   ID: abc-123-def

2. 🟡 📚 Study Session ⏰ 14:00
   ID: xyz-789-ghi

💡 Copy the task ID and use: /edittask <task-id>
```

2. **Select Task:**
```
/edittask abc-123-def
```

Bot shows current details and asks for updates.

3. **Send Updates:**
```
Team Standup | Daily sync | high | work | 09:30 | 10:00 | in_progress
```

4. **Confirmation:**
```
✅ Task Updated Successfully!

🔄 💼 Team Standup
Daily sync

🔴 Priority: HIGH
📁 Category: work
🕐 Time: 09:30 - 10:00
📊 Status: in_progress
⏰ Reminders: Rescheduled

Changes Made:
📝 Title updated
📄 Description updated
⏰ Start time updated
⏰ End time updated
📊 Status changed: pending → in_progress
```

---

## 2. Delete Task - `/deletetask`

### Usage

**Without Task ID:**
```
/deletetask
```
Bot akan menampilkan daftar semua task dengan ID masing-masing.

**With Task ID:**
```
/deletetask <task-id>
```
Bot akan langsung menghapus task tersebut.

### Features

⚠️ **Permanent deletion** - cannot be undone!
✅ Shows all tasks (including completed)
✅ Confirms deletion with task details
✅ Removes task and all related reminders
✅ Inline buttons for quick actions

### Workflow Example

1. **List Tasks:**
```
/deletetask
```

Bot shows:
```
🗑️ Delete Task

Recent Tasks:

1. 📋 🔴 💼 Team Meeting ⏰ 09:00
   ID: abc-123-def

2. ✅ 🟡 📚 Study Session ⏰ 14:00
   ID: xyz-789-ghi

⚠️ Warning: Deletion is permanent and cannot be undone!

💡 Copy the task ID and use: /deletetask <task-id>
```

2. **Delete Task:**
```
/deletetask abc-123-def
```

3. **Confirmation:**
```
✅ Task Deleted Successfully!

🗑️ Deleted task: Team Meeting
Discuss project goals

📊 Priority: high
📁 Category: work

The task has been permanently removed from your list.

Use /today to see your remaining tasks.
```

---

## Safety Features

### Edit Task Safety
- ✅ Validates task ownership (can only edit own tasks)
- ✅ Preserves existing values for empty inputs
- ✅ Validates all field formats
- ✅ Shows changes summary before saving
- ✅ Maintains data integrity

### Delete Task Safety
- ⚠️ Shows warning about permanent deletion
- ✅ Validates task ownership (can only delete own tasks)
- ✅ Cascading delete (removes related reminders)
- ✅ Confirmation with task details
- ❌ No undo functionality (by design)

---

## Quick Reference

| Command | Description | Format |
|---------|-------------|--------|
| `/edittask` | List tasks to edit | No parameters |
| `/edittask <id>` | Edit specific task | Task ID |
| `/deletetask` | List tasks to delete | No parameters |
| `/deletetask <id>` | Delete specific task | Task ID |
| `/cancel` | Cancel edit operation | No parameters |

---

## Tips & Best Practices

### Editing Tasks

1. **Partial Updates:**
   - Only fill fields you want to change
   - Leave fields empty to keep current values
   - Example: `New Title | | | | | |` changes only title

2. **Status Updates:**
   - Use `| | | | | | done` to mark as complete
   - Use `| | | | | | in_progress` to start working
   - Status 'done' automatically stops reminders

3. **Time Changes:**
   - Format: HH:MM (24-hour, e.g., 14:30)
   - Reminders auto-reschedule when time changes
   - Required for reminder system to work

4. **Quick Edits:**
   - Copy task ID from /today or /edittask listing
   - Use direct command: `/edittask abc-123`
   - Faster than navigating menus

### Deleting Tasks

1. **Before Deleting:**
   - Consider marking as 'done' instead
   - Deletion is permanent (no undo)
   - Review task details carefully

2. **Bulk Cleanup:**
   - Use /today to identify completed tasks
   - Delete multiple tasks one by one
   - Consider weekly cleanup routine

3. **Alternative to Delete:**
   - Mark as done: keeps history
   - Edit to postpone: change time
   - Archive in app: for reference

---

## Common Use Cases

### 1. Postpone Task
```
/edittask abc-123
| | | | 16:00 | 17:00 | 
```
Changes time without affecting other details.

### 2. Mark as Complete
```
/edittask abc-123
| | | | | | done
```
Quick way to complete task.

### 3. Increase Priority
```
/edittask abc-123
| | high | | | | 
```
Bump priority without changing anything else.

### 4. Fix Typo in Title
```
/edittask abc-123
Correct Title | | | | | | 
```
Update title while keeping everything else.

### 5. Remove Completed Task
```
/deletetask abc-123
```
Clean up finished tasks.

### 6. Cancel Mistaken Task
```
/deletetask xyz-789
```
Remove task created by mistake.

---

## Error Handling

### Common Errors

**Task Not Found:**
- Task ID invalid or doesn't belong to you
- Use /edittask or /deletetask to list your tasks

**Empty Title:**
- Title cannot be empty when editing
- Provide at least the title field

**Invalid Time Format:**
- Use HH:MM format (e.g., 09:00, 14:30)
- Must be valid 24-hour time

**Invalid Priority/Category/Status:**
- Priority: high, medium, low
- Category: work, learn, rest
- Status: pending, in_progress, done

---

## Integration Notes

- **Reminders:** Auto-reschedule when time changes
- **Daily Summary:** Reflects edited tasks
- **Today View:** Shows updated information
- **App Sync:** Changes sync with LifePath app
- **History:** No edit history (shows current state)

---

## Troubleshooting

**Can't edit task:**
- Verify you own the task (use /today)
- Check task ID is correct
- Ensure you're verified (/status)

**Changes not saved:**
- Check input format (pipe | separators)
- Verify field values are valid
- Review error messages

**Reminders not updating:**
- Check if time_start is provided
- Verify status is not 'done'
- See reminder logs in app

**Deleted wrong task:**
- No undo available
- Recreate task manually
- Use /addtask with same details

---

Last Updated: November 10, 2025
