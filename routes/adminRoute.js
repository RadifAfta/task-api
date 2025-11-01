import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { authorizeRole } from "../middlewares/roleMiddleware.js";
import {
  getAllUsers,
  getAllTasksAdmin,
  updateUserRole,
  deleteUser,
} from "../controllers/adminController.js";

const router = express.Router();

// Semua route admin hanya untuk role: admin
router.use(verifyToken, authorizeRole("admin"));

// 🔹 Daftar semua user
router.get("/users", getAllUsers);

// 🔹 Semua task dari seluruh user
router.get("/tasks", getAllTasksAdmin);

// 🔹 Ubah role user (user ⇄ admin)
router.put("/users/:id/role", updateUserRole);

// 🔹 Hapus user
router.delete("/users/:id", deleteUser);

export default router;

/* ============================================================
   📘 SWAGGER DOCUMENTATION (ADMIN)
   ============================================================ */
/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Endpoint khusus untuk admin
 *
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Ambil semua user (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar semua user
 *
 * /admin/tasks:
 *   get:
 *     tags: [Admin]
 *     summary: Ambil semua task dari seluruh user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil data task
 *
 * /admin/users/{id}/role:
 *   put:
 *     tags: [Admin]
 *     summary: Ubah role user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 example: admin
 *     responses:
 *       200:
 *         description: Role user berhasil diubah
 *       400:
 *         description: Role tidak valid
 *       404:
 *         description: User tidak ditemukan
 *
 * /admin/users/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Hapus user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User berhasil dihapus
 *       404:
 *         description: User tidak ditemukan
 */
