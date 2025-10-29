import express from 'express';
import authRoute from './authRoute.js';
import taskRoute from './taskRoute.js';

const router = express.Router();

// Auth routes - /api/auth/*
router.use('/auth', authRoute);

// Task routes - /api/tasks/*
router.use('/tasks', taskRoute);

export default router;