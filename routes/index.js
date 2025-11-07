import express from 'express';
import authRoute from './authRoute.js';
import taskRoute from './taskRoute.js';
import AdminRoute from './adminRoute.js';
import routineRoute from './routineRoute.js';

const router = express.Router();

// Auth routes - /api/auth/*
router.use('/auth', authRoute);

// Task routes - /api/tasks/*
router.use('/tasks', taskRoute);

// Admin routes - /api/admin/*
router.use('/admin', AdminRoute);

// Routine routes - /api/routines/*
router.use('/routines', routineRoute);

export default router;