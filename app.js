import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoute.js";

dotenv.config();
const app = express();

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// Default
app.get("/", (req, res) => {
  res.send("Auth API Running 🚀");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
