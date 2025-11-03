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
import {
  validateCreateTask,
  validateUpdateTask,
  validateTaskId,
  validateTaskQuery
} from "../middlewares/validationMiddleware.js";

const router = express.Router();

// Semua route butuh login
router.use(verifyToken);

// CRUD Routes
router.post("/", validateCreateTask, addTask);
router.get("/", validateTaskQuery, getAllTasks);
router.get("/:id", validateTaskId, getTask);
router.put("/:id", validateTaskId, validateUpdateTask, editTask);
router.delete("/:id", validateTaskId, removeTask);

export default router;

/* ============================================================
   📘 SWAGGER DOCUMENTATION (TASKS)
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
 *
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           example: 1
 *           description: Halaman saat ini
 *         limit:
 *           type: integer
 *           example: 10
 *           description: Jumlah item per halaman
 *         total:
 *           type: integer
 *           example: 25
 *           description: Total seluruh data
 *         totalPages:
 *           type: integer
 *           example: 3
 *           description: Total jumlah halaman
 *         hasNext:
 *           type: boolean
 *           example: true
 *           description: Apakah ada halaman selanjutnya
 *         hasPrevious:
 *           type: boolean
 *           example: false
 *           description: Apakah ada halaman sebelumnya
 *
 *     TaskListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Task'
 *         pagination:
 *           $ref: '#/components/schemas/PaginationMeta'
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "✅ Task created successfully"
 *                 task:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Request tidak valid
 *
 *   get:
 *     tags: [Tasks]
 *     summary: Ambil semua task milik user dengan pagination (protected)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Nomor halaman
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Jumlah item per halaman
 *         example: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, done]
 *         description: Filter task berdasarkan status
 *         example: pending
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Cari task berdasarkan judul atau deskripsi
 *         example: belajar
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar task dengan pagination
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskListResponse'
 *             example:
 *               data:
 *                 - id: "1"
 *                   title: "Belajar Swagger"
 *                   description: "Integrasi Swagger di Express"
 *                   status: "pending"
 *                   priority: "medium"
 *                   createdAt: "2025-11-03T10:00:00.000Z"
 *                   updatedAt: "2025-11-03T10:00:00.000Z"
 *               pagination:
 *                 page: 1
 *                 limit: 10
 *                 total: 25
 *                 totalPages: 3
 *                 hasNext: true
 *                 hasPrevious: false
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Task updated successfully"
 *                 task:
 *                   $ref: '#/components/schemas/Task'
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Task deleted successfully"
 *       404:
 *         description: Task tidak ditemukan
 */