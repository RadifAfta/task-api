import { pool } from "../config/db.js";

// 🧩 Ambil semua user
export const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
    );

    res.json({
      message: "✅ Daftar semua user",
      count: result.rowCount,
      users: result.rows,
    });
  } catch (error) {
    console.error("Error getAllUsers:", error);
    res.status(500).json({ message: "❌ Gagal mengambil data users" });
  }
};

// 🧩 Ambil semua task (milik semua user)
export const getAllTasksAdmin = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.id, t.title, t.status, t.priority, t.due_date, 
             u.name AS user_name, u.email AS user_email
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `);

    res.json({
      message: "✅ Daftar semua task di sistem",
      count: result.rowCount,
      tasks: result.rows,
    });
  } catch (error) {
    console.error("Error getAllTasksAdmin:", error);
    res.status(500).json({ message: "❌ Gagal mengambil data tasks" });
  }
};

// 🧩 Ubah role user (misalnya user → admin)
export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({ message: "❌ Role tidak valid" });
  }

  try {
    const result = await pool.query(
      "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role",
      [role, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    res.json({
      message: "✅ Role user berhasil diupdate",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error updateUserRole:", error);
    res.status(500).json({ message: "❌ Gagal mengupdate role user" });
  }
};

// 🧩 Hapus user
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "❌ User tidak ditemukan" });
    }

    res.json({ message: "✅ User berhasil dihapus" });
  } catch (error) {
    console.error("Error deleteUser:", error);
    res.status(500).json({ message: "❌ Gagal menghapus user" });
  }
};
