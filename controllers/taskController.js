import {
  createTask,
  getTasksByUser,
  getTaskById,
  updateTask,
  deleteTask,
} from "../models/taskModel.js";

// CREATE TASK
export const addTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, status, priority, due_date } = req.body;

    if (!title) return res.status(400).json({ message: "Title is required" });

    const newTask = await createTask(
      userId,
      title,
      description || "",
      status || "pending",
      priority || "medium",
      due_date || null
    );

    res.status(201).json({ message: "✅ Task created successfully", task: newTask });
  } catch (error) {
    console.error("Error creating task:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// GET ALL TASKS (USER)
export const getAllTasks = async (req, res) => {
  try {
    const tasks = await getTasksByUser(req.user.id);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET SINGLE TASK
export const getTask = async (req, res) => {
  try {
    const task = await getTaskById(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE TASK
export const editTask = async (req, res) => {
  try {
    const updated = await updateTask(req.params.id, req.user.id, req.body);
    if (!updated) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "✅ Task updated", task: updated });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE TASK
export const removeTask = async (req, res) => {
  try {
    const deleted = await deleteTask(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "🗑️ Task deleted successfully", task: deleted });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
