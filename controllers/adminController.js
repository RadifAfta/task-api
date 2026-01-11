import AdminService from "../services/adminService.js";

// 🧩 Ambil semua user
export const getAllUsers = async (req, res) => {
  try {
    const result = await AdminService.getAllUsers();

    if (!result.success) {
      return res.status(500).json({ message: "❌ Gagal mengambil data users" });
    }

    res.json({
      message: "✅ Daftar semua user",
      count: result.count,
      users: result.users,
    });
  } catch (error) {
    console.error("Error getAllUsers:", error);
    res.status(500).json({ message: "❌ Gagal mengambil data users" });
  }
};

// 🧩 Ambil semua task (milik semua user)
export const getAllTasksAdmin = async (req, res) => {
  try {
    const result = await AdminService.getAllTasks();

    if (!result.success) {
      return res.status(500).json({ message: "❌ Gagal mengambil data tasks" });
    }

    res.json({
      message: "✅ Daftar semua task di sistem",
      count: result.count,
      tasks: result.tasks,
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

  try {
    const result = await AdminService.updateUserRole(id, role);

    if (!result.success) {
      if (result.error === 'User not found') {
        return res.status(404).json({ message: "❌ User tidak ditemukan" });
      }
      return res.status(400).json({ message: `❌ ${result.error}` });
    }

    res.json({
      message: "✅ Role user berhasil diupdate",
      user: result.user,
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
    const result = await AdminService.deleteUser(id);

    if (!result.success) {
      if (result.error === 'User not found') {
        return res.status(404).json({ message: "❌ User tidak ditemukan" });
      }
      return res.status(500).json({ message: `❌ ${result.error}` });
    }

    res.json({ message: "✅ User berhasil dihapus" });
  } catch (error) {
    console.error("Error deleteUser:", error);
    res.status(500).json({ message: "❌ Gagal menghapus user" });
  }
};

// 🧩 Get system statistics
export const getSystemStats = async (req, res) => {
  try {
    const result = await AdminService.getSystemStats();

    if (!result.success) {
      return res.status(500).json({ message: "❌ Gagal mengambil statistik sistem" });
    }

    res.json({
      message: "✅ Statistik sistem",
      stats: result.stats,
    });
  } catch (error) {
    console.error("Error getSystemStats:", error);
    res.status(500).json({ message: "❌ Gagal mengambil statistik sistem" });
  }
};

// 🧩 Cleanup old data
export const cleanupOldData = async (req, res) => {
  try {
    const { days } = req.query; // Optional: specify days, default 90
    const result = await AdminService.cleanupOldData(days ? parseInt(days) : 90);

    if (!result.success) {
      return res.status(500).json({ message: `❌ ${result.error}` });
    }

    res.json({
      message: result.message,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error cleanupOldData:", error);
    res.status(500).json({ message: "❌ Gagal melakukan cleanup" });
  }
};
