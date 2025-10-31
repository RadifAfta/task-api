import express from 'express';
import authRoute from './authRoute.js';
import taskRoute from './taskRoute.js';
import AdminRoute from './adminRoute.js';

const router = express.Router();

// Auth routes - /api/auth/*
router.use('/auth', authRoute);

// Task routes - /api/tasks/*
router.use('/tasks', taskRoute);

// Admin routes - /api/admin/*
router.use('/admin', AdminRoute);

export default router;