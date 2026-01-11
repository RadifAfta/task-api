import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserService from "../services/userService.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

// REGISTER
export const register = async (req, res) => {
  console.log('Register request body:', req.body); // Debug log
  const { name, email, password, role } = req.body;
  console.log('Destructured values:', { name, email, password: password ? '***' : password, role }); // Debug log

  try {
    // Cek apakah email sudah terdaftar
    const existingUser = await UserService.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Enkripsi password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kirim role hanya kalau disediakan dan valid
    const validRoles = ["user", "admin"];
    const userRole =
      role && validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : "user";

    // Simpan user baru ke database via service
    const result = await UserService.createUser({
      name,
      email,
      passwordHash: hashedPassword,
      role: userRole
    });

    if (!result.success) {
      return res.status(500).json({ message: result.error || "Failed to create user" });
    }

    const newUser = result.user;

    res.status(201).json({
      message: "✅ User registered successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// LOGIN
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await UserService.findUserByEmail(email);
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// PROFILE (protected)
export const getProfile = async (req, res) => {
  try {
    const user = await UserService.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
