import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { authorizeRole } from "../middlewares/roleMiddleware.js";
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

/* ============================================================
   📘 SWAGGER DOCUMENTATION
   ============================================================ */

/**
 * @swagger
 * tags:
 *   - name: Tasks
 *     description: API untuk manajemen tugas (CRUD Task)
 *
 * components:
 *   schemas:
 *     TaskInput:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *           example: Belajar Swagger
 *         description:
 *           type: string
 *           example: Integrasi Swagger di Express
 *         dueDate:
 *           type: string
 *           format: date
 *           example: 2025-12-31
 *
 *     Task:
 *       allOf:
 *         - $ref: '#/components/schemas/TaskInput'
 *         - type: object
 *           properties:
 *             id:
 *               type: string
 *               example: "8a7e1a4b-6b3e-42d2-b6d7-1f8e4a74c3c2"
 *             status:
 *               type: string
 *               enum: [pending, in_progress, done]
 *               example: pending
 *             priority:
 *               type: string
 *               enum: [low, medium, high]
 *               example: medium
 *             createdAt:
 *               type: string
 *               format: date-time
 *               example: "2025-01-01T00:00:00.000Z"
 *             updatedAt:
 *               type: string
 *               format: date-time
 *               example: "2025-01-02T12:00:00.000Z"
 */

/**
 * @swagger
 * /tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Buat task baru (protected)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskInput'
 *     responses:
 *       201:
 *         description: Task berhasil dibuat
 *       400:
 *         description: Request tidak valid
 *
 *   get:
 *     tags: [Tasks]
 *     summary: Ambil semua task milik user (protected)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar task
 *       401:
 *         description: Unauthorized / token invalid
 */

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Ambil task berdasarkan id (protected)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID task
 *     responses:
 *       200:
 *         description: Detail task
 *       404:
 *         description: Task tidak ditemukan
 *
 *   put:
 *     tags: [Tasks]
 *     summary: Update task berdasarkan id (protected)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID task
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskInput'
 *     responses:
 *       200:
 *         description: Task berhasil diupdate
 *       400:
 *         description: Request tidak valid
 *       404:
 *         description: Task tidak ditemukan
 *
 *   delete:
 *     tags: [Tasks]
 *     summary: Hapus task berdasarkan id (protected)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID task
 *     responses:
 *       200:
 *         description: Task berhasil dihapus
 *       404:
 *         description: Task tidak ditemukan
 */
