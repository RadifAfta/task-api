import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { authorizeRole } from "../middlewares/roleMiddleware.js";
import {
  getAllUsers,
  getAllTasksAdmin,
  updateUserRole,
  deleteUser,
  getSystemStats,
  cleanupOldData,
} from "../controllers/adminController.js";
import {
  validateUserId,
  validateRoleAssignment,
} from "../middlewares/validationMiddleware.js";

const router = express.Router();

// Semua route admin hanya untuk role: admin
router.use(verifyToken, authorizeRole("admin"));

// 🔹 Daftar semua user
router.get("/users", getAllUsers);

// 🔹 Semua task dari seluruh user
router.get("/tasks", getAllTasksAdmin);

// 🔹 System statistics
router.get("/stats", getSystemStats);

// 🔹 Cleanup old data
router.post("/cleanup", cleanupOldData);

// 🔹 Ubah role user (user ⇄ admin)
router.put(
  "/users/:id/role",
  validateUserId,
  validateRoleAssignment,
  updateUserRole
);

// 🔹 Hapus user
router.delete("/users/:id", validateUserId, deleteUser);

export default router;

/* ============================================================
   📘 SWAGGER DOCUMENTATION (ADMIN)
   ============================================================ */

/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Endpoint khusus untuk admin (role admin required)
 *
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "user-uuid-123"
 *         username:
 *           type: string
 *           example: "testuser"
 *         email:
 *           type: string
 *           example: "test@example.com"
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           example: "user"
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2025-11-03T10:00:00Z"
 *
 *     AdminTask:
 *       allOf:
 *         - $ref: '#/components/schemas/Task'
 *         - type: object
 *           properties:
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *
 *     UpdateRoleRequest:
 *       type: object
 *       required:
 *         - role
 *       properties:
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           example: "admin"
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Ambil semua user (admin only)
 *     description: Menampilkan daftar semua user beserta informasi role mereka
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar semua user berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *             example:
 *               data:
 *                 - id: "user-1"
 *                   username: "user1"
 *                   email: "user1@example.com"
 *                   role: "user"
 *                   created_at: "2025-11-03T10:00:00Z"
 *                 - id: "admin-1"
 *                   username: "admin1"
 *                   email: "admin@example.com"
 *                   role: "admin"
 *                   created_at: "2025-11-02T09:00:00Z"
 *       403:
 *         description: Access denied - Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Access denied"
 */

/**
 * @swagger
 * /admin/tasks:
 *   get:
 *     tags: [Admin]
 *     summary: Ambil semua task dari seluruh user (admin only)
 *     description: Menampilkan semua task dari semua user beserta informasi user pemilik
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil data task dari semua user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AdminTask'
 *             example:
 *               data:
 *                 - id: "task-1"
 *                   title: "Task User 1"
 *                   description: "Task dari user pertama"
 *                   status: "pending"
 *                   user:
 *                     id: "user-1"
 *                     username: "user1"
 *                     email: "user1@example.com"
 *       403:
 *         description: Access denied - Admin role required
 */

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Ambil statistik sistem (admin only)
 *     description: Menampilkan statistik lengkap sistem termasuk jumlah user, task, routine, transaksi, dan breakdown task by status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistik sistem berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "✅ Statistik sistem"
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       example: 150
 *                     totalTasks:
 *                       type: integer
 *                       example: 3420
 *                     totalRoutines:
 *                       type: integer
 *                       example: 45
 *                     totalTransactions:
 *                       type: integer
 *                       example: 890
 *                     tasksByStatus:
 *                       type: object
 *                       properties:
 *                         pending:
 *                           type: integer
 *                           example: 120
 *                         in_progress:
 *                           type: integer
 *                           example: 85
 *                         completed:
 *                           type: integer
 *                           example: 3215
 *                     recentTasks:
 *                       type: integer
 *                       description: Task yang dibuat dalam 7 hari terakhir
 *                       example: 42
 *       403:
 *         description: Access denied - Admin role required
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "❌ Gagal mengambil statistik sistem"
 */

/**
 * @swagger
 * /admin/cleanup:
 *   post:
 *     tags: [Admin]
 *     summary: Cleanup task completed yang sudah lama (admin only)
 *     description: Menghapus task dengan status completed yang lebih lama dari jumlah hari yang ditentukan (default 90 hari)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 90
 *           minimum: 1
 *         description: Hapus task completed yang lebih lama dari jumlah hari ini
 *         example: 90
 *     responses:
 *       200:
 *         description: Cleanup berhasil dilakukan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Deleted 450 old completed tasks"
 *                 deletedCount:
 *                   type: integer
 *                   example: 450
 *             example:
 *               message: "Deleted 450 old completed tasks"
 *               deletedCount: 450
 *       403:
 *         description: Access denied - Admin role required
 *       500:
 *         description: Server error saat cleanup
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "❌ Gagal melakukan cleanup"
 */

/**
 * @swagger
 * /admin/users/{id}/role:
 *   put:
 *     tags: [Admin]
 *     summary: Ubah role user (admin only)
 *     description: Mengubah role user antara 'user' dan 'admin'
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID user yang akan diubah rolenya
 *         example: "user-uuid-123"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRoleRequest'
 *           examples:
 *             makeAdmin:
 *               summary: Ubah ke admin
 *               value:
 *                 role: "admin"
 *             makeUser:
 *               summary: Ubah ke user
 *               value:
 *                 role: "user"
 *     responses:
 *       200:
 *         description: Role user berhasil diubah
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User role updated successfully"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Role tidak valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid role. Must be 'user' or 'admin'"
 *       404:
 *         description: User tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       403:
 *         description: Access denied - Admin role required
 */

/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Hapus user (admin only)
 *     description: Menghapus user dan semua task yang terkait
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID user yang akan dihapus
 *         example: "user-uuid-123"
 *     responses:
 *       200:
 *         description: User berhasil dihapus
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User deleted successfully"
 *       404:
 *         description: User tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       403:
 *         description: Access denied - Admin role required
 *       400:
 *         description: Cannot delete own account
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cannot delete your own account"
 */
