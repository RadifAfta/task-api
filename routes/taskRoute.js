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

/**
 * @swagger
 * /tasks:
 *   post:
 *     tags:
 *       - Tasks
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Request tidak valid
 */
router.post("/", addTask);

/**
 * @swagger
 * /tasks:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: Ambil semua task user (protected)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar task
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized / token invalid
 */
router.get("/", getAllTasks);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     tags:
 *       - Tasks
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       404:
 *         description: Task tidak ditemukan
 */
router.get("/:id", getTask);

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     tags:
 *       - Tasks
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Request tidak valid
 *       404:
 *         description: Task tidak ditemukan
 */
router.put("/:id", editTask);

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     tags:
 *       - Tasks
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Task deleted
 *       404:
 *         description: Task tidak ditemukan
 */
router.delete("/:id", removeTask);

export default router;

/**
 * @swagger
 * components:
 *   schemas:
 *     TaskInput:
 *       type: object
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
 *       required:
 *         - title
 *
 *     Task:
 *       allOf:
 *         - $ref: '#/components/schemas/TaskInput'
 *         - type: object
 *           properties:
 *             id:
 *               type: string
 *               example: 12345
 *             createdAt:
 *               type: string
 *               format: date-time
 *               example: '2025-01-01T00:00:00.000Z'
 */

