# Telegram Routine Template Management Guide

## Overview
Fitur ini memungkinkan user untuk membuat dan mengelola routine template (template harian) langsung dari Telegram bot.

## Commands

### 1. Create Routine Template
**Command:** `/createroutine`

**Format Input:**
```
Name | Description
```

**Examples:**
```
Morning Routine | Daily morning productivity tasks
Evening Routine | Wind down and prepare for tomorrow
Study Routine | Learning and development tasks
Workout Routine | Daily exercise and fitness
```

**Steps:**
1. Send `/createroutine`
2. Bot akan meminta informasi routine
3. Kirim dalam format: `Name | Description`
4. Bot akan membuat routine template dan memberikan ID
5. Gunakan ID tersebut untuk menambahkan tasks

---

### 2. Add Task to Routine Template
**Command:** `/addtasktoroutine <routine-id>`

**Format Input:**
```
Title | Description | Priority | Category | TimeStart | TimeEnd
```

**Examples:**
```
Morning Exercise | 30 min workout | high | rest | 06:00 | 06:30
Check Emails | Review and respond | medium | work | 09:00 | 09:30
Study Session | Learn new topics | high | learn | 14:00 | 16:00
Meditation | Mindfulness practice | medium | rest | 20:00 | 20:30
```

**Field Details:**
- **Title**: Task name (required)
- **Description**: Task details (optional)
- **Priority**: high/medium/low (default: medium)
- **Category**: work/learn/rest (default: work)
- **TimeStart**: Start time in HH:MM format ⚠️ **REQUIRED for reminder system!**
- **TimeEnd**: End time in HH:MM format (optional)

> ⚠️ **IMPORTANT:** TimeStart is MANDATORY for all routine tasks! Without it, the reminder system will not work when tasks are generated from this routine template.

**Steps:**
1. Get routine ID from `/myroutines` or after creating routine
2. Send `/addtasktoroutine <routine-id>`
3. Bot akan meminta informasi task
4. Kirim task details dalam format yang ditentukan
5. Task akan ditambahkan ke routine template

---

### 3. View Routine Templates
**Command:** `/myroutines`

**Features:**
- View all routine templates (active & inactive)
- See task count for each routine
- Get routine IDs for other operations
- Quick buttons to generate routines

---

### 4. Generate Daily Tasks from Routine
**Command:** `/generateroutine <routine-id>`

**Usage:**
```
/generateroutine abc123-def456-ghi789
```

**Without ID:**
```
/generateroutine
```
Will list all available routines to choose from.

**Features:**
- Generates daily tasks from routine template
- Automatically schedules reminders
- Prevents duplicate generation for same day
- Shows summary of generated tasks

---

### 5. Generate All Active Routines
**Quick Action:** Use "Generate All" button in `/menu` or `/myroutines`

**Features:**
- Generates tasks from all active routines at once
- Shows summary of total tasks generated
- Skips already generated routines for today

---

## Complete Workflow Example

### Creating a Morning Routine Template

1. **Create Routine:**
```
/createroutine
```
Bot response: "Send routine info..."

Send:
```
Morning Routine | Start the day productively
```

2. **Add First Task:**
```
/addtasktoroutine abc123-def456-ghi789
```
Send:
```
Morning Exercise | Yoga and stretching | high | rest | 06:00 | 06:30
```

3. **Add More Tasks:**
```
/addtasktoroutine abc123-def456-ghi789
```
Send:
```
Breakfast | Healthy breakfast | medium | rest | 06:45 | 07:15
```

Send:
```
Review Goals | Check daily objectives | high | work | 07:30 | 08:00
```

4. **Generate Daily Tasks:**
```
/generateroutine abc123-def456-ghi789
```

5. **View Generated Tasks:**
```
/today
```

---

## Tips

1. **Organize by Time Blocks:**
   - Morning Routine (06:00 - 09:00)
   - Work Routine (09:00 - 17:00)
   - Evening Routine (18:00 - 22:00)

2. **Use Categories Wisely:**
   - `work`: Professional tasks
   - `learn`: Educational activities
   - `rest`: Personal care, exercise, breaks

3. **Set Priorities:**
   - `high`: Must-do tasks
   - `medium`: Should-do tasks
   - `low`: Nice-to-do tasks

4. **Time Management:**
   - Add start/end times for better scheduling
   - Leave buffer time between tasks
   - Include breaks in your routine

5. **Automation:**
   - Set up daily generation at specific times (via app)
   - Use "Generate All" for quick daily setup
   - Review and adjust routines weekly

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `/createroutine` | Create new routine template |
| `/addtasktoroutine <id>` | Add task to routine |
| `/myroutines` | View all routines |
| `/generateroutine <id>` | Generate tasks from routine |
| `/today` | View today's tasks |
| `/cancel` | Cancel current operation |

---

## Troubleshooting

**Routine not found:**
- Use `/myroutines` to get correct routine ID
- Make sure you own the routine

**Can't add tasks:**
- Verify routine ID is correct
- Check if routine exists and is active

**Tasks not generating:**
- Check if tasks already generated for today
- Verify routine has tasks added
- Ensure routine is active

---

## Integration with App

All routine templates created via Telegram are synced with the LifePath app:
- View and edit in app
- Set auto-generation schedules
- Manage task order and details
- Export/import routines
- Share routines with others

---

Last Updated: November 10, 2025
