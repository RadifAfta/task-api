import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {
  addTask,
  getAllTasks,
  getTask,
  editTask,
  removeTask,
} from "../controllers/taskController.js";

const router = express.Router();

// Semua route butuh login
router.use(verifyToken);

// CRUD
router.post("/", addTask);
router.get("/", getAllTasks);
router.get("/:id", getTask);
router.put("/:id", editTask);
router.delete("/:id", removeTask);

export default router;
