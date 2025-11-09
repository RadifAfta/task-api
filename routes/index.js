import express from 'express';
import authRoute from './authRoute.js';
import taskRoute from './taskRoute.js';
import AdminRoute from './adminRoute.js';
import routineRoute from './routineRoute.js';
import reminderRoute from './reminderRoute.js';
import telegramRoute from './telegramRoute.js';

const router = express.Router();

// Auth routes - /api/auth/*
router.use('/auth', authRoute);

// Task routes - /api/tasks/*
router.use('/tasks', taskRoute);

// Admin routes - /api/admin/*
router.use('/admin', AdminRoute);

// Routine routes - /api/routines/*
router.use('/routines', routineRoute);

// Telegram routes - /api/telegram/*
router.use('/telegram', telegramRoute);

// Reminder routes - /api/reminders/*
router.use('/reminders', reminderRoute);

export default router;