import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import routes from "./routes/index.js";
import { swaggerUi, swaggerSpec } from "./swagger.js"; // import file swagger
import { customErrorHandler } from "./middlewares/customErrorMiddleware.js"; // import file custom error handler
import { initializeScheduler, shutdownScheduler } from "./services/schedulerService.js"; // import scheduler
import * as telegramService from "./services/telegramService.js"; // import telegram bot

// Load environment variables
dotenv.config();

// Initialize express
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Swagger Documentation Route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use("/api", routes);

// Error handling middleware (custom)
app.use(customErrorHandler);

// Default route
app.get("/", (req, res) => {
  res.json({ 
    message: "Task API Running 🚀",
    version: "1.0.0"
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found"
  });
});

// Start server
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 Swagger docs available at http://localhost:${PORT}/api-docs`);
  
  // Initialize Telegram Bot
  setTimeout(() => {
    telegramService.initializeTelegramBot();
  }, 1000);
  
  // Initialize Scheduler System (Daily Routines + Smart Reminders)
  setTimeout(() => {
    initializeScheduler();
  }, 2000); // Wait 2 seconds for database connections to stabilize
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  telegramService.stopTelegramBot();
  shutdownScheduler();
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  telegramService.shutdownTelegramBot();
  shutdownScheduler();
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

export default app;
