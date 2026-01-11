import TaskService from "../services/taskService.js";
import { createPaginationResponse, validatePaginationParams } from "../utils/pagination.js";
import * as reminderService from "../services/reminderService.js";

// CREATE TASK
export const addTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, status, priority, category, dueDate, timeStart, timeEnd } = req.body;

    if (!title) return res.status(400).json({ message: "Title is required" });

    const taskData = {
      title,
      description: description || "",
      status: status || "pending",
      priority: priority || "medium",
      category: category || "work",
      dueDate: dueDate || null,
      time_start: timeStart || null,
      time_end: timeEnd || null
    };

    const result = await TaskService.createTask(userId, taskData);

    if (!result.success) {
      return res.status(500).json({ message: result.error || "Failed to create task" });
    }

    // Schedule reminders for the new task (already handled in service but can add extra logic here if needed)
    res.status(201).json({ message: "✅ Task created successfully", task: result.task });
  } catch (error) {
    console.error("Error creating task:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// GET ALL TASKS (USER) WITH PAGINATION
export const getAllTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, category, search } = req.query;
    
    // Validasi dan ambil parameter pagination
    const { page, limit, offset } = validatePaginationParams(req.query);

    // Ambil data dengan pagination via service
    const result = await TaskService.getTasksByUser(userId, { 
      status, 
      category,
      search, 
      page, 
      limit, 
      offset 
    });

    if (!result.success) {
      return res.status(500).json({ message: result.error || "Failed to fetch tasks" });
    }

    // Buat response dengan pagination metadata
    const response = createPaginationResponse(
      result.tasks,
      page,
      limit,
      result.total
    );

    res.json(response);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET SINGLE TASK
export const getTask = async (req, res) => {
  try {
    const result = await TaskService.getTaskById(req.params.id, req.user.id);
    
    if (!result.success) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(result.task);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE TASK
export const editTask = async (req, res) => {
  try {
    const result = await TaskService.updateTask(req.params.id, req.user.id, req.body);
    
    if (!result.success) {
      return res.status(404).json({ message: result.error || "Task not found" });
    }

    res.json({ message: "✅ Task updated", task: result.task });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE TASK
export const removeTask = async (req, res) => {
  try {
    const result = await TaskService.deleteTask(req.params.id, req.user.id);
    
    if (!result.success) {
      return res.status(404).json({ message: result.error || "Task not found" });
    }

    res.json({ message: "🗑️ Task deleted successfully", task: result.task });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
