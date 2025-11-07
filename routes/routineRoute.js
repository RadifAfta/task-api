import express from "express";
import * as routineController from "../controllers/routineController.js";
import * as schedulerService from "../services/schedulerService.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { 
  validateCreateRoutineTemplate,
  validateUpdateRoutineTemplate,
  validateCreateTemplateTask,
  validateUpdateTemplateTask,
  validateBulkCreateTemplateTasks,
  validateGenerateRoutine,
  validateDeleteGeneratedRoutine
} from "../middlewares/validationMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     RoutineTemplate:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the routine template
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID of the user who owns this routine
 *         name:
 *           type: string
 *           description: Name of the routine template
 *           example: "Morning Productivity Routine"
 *         description:
 *           type: string
 *           description: Description of the routine
 *           example: "Daily morning routine for productivity and focus"
 *         is_active:
 *           type: boolean
 *           description: Whether the routine template is active
 *           default: true
 *         tasks_count:
 *           type: integer
 *           description: Number of active tasks in this routine
 *         has_tasks:
 *           type: boolean
 *           description: Whether this routine has any active tasks
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 * 
 *     TemplateTask:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         routine_template_id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *           description: Task title
 *           example: "Morning Meditation"
 *         description:
 *           type: string
 *           description: Task description
 *           example: "10 minutes of mindfulness meditation"
 *         category:
 *           type: string
 *           enum: [work, learn, rest]
 *           default: work
 *         priority:
 *           type: string
 *           enum: [low, medium, high]
 *           default: medium
 *         time_start:
 *           type: string
 *           format: time
 *           example: "06:00"
 *         time_end:
 *           type: string
 *           format: time
 *           example: "06:10"
 *         estimated_duration:
 *           type: integer
 *           description: Estimated duration in minutes
 *           example: 10
 *         order_index:
 *           type: integer
 *           description: Order of task in routine
 *           default: 0
 *         is_active:
 *           type: boolean
 *           default: true
 * 
 *     RoutineTemplateInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           example: "Morning Productivity Routine"
 *         description:
 *           type: string
 *           maxLength: 500
 *           example: "Daily morning routine for productivity and focus"
 *         isActive:
 *           type: boolean
 *           default: true
 * 
 *     TemplateTaskInput:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           example: "Morning Meditation"
 *         description:
 *           type: string
 *           maxLength: 500
 *           example: "10 minutes of mindfulness meditation"
 *         category:
 *           type: string
 *           enum: [work, learn, rest]
 *           default: work
 *         priority:
 *           type: string
 *           enum: [low, medium, high]
 *           default: medium
 *         timeStart:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *           example: "06:00"
 *         timeEnd:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *           example: "06:10"
 *         estimatedDuration:
 *           type: integer
 *           minimum: 1
 *           maximum: 1440
 *           example: 10
 *         orderIndex:
 *           type: integer
 *           minimum: 0
 *           default: 0
 */

// ============= ROUTINE TEMPLATES ROUTES =============

/**
 * @swagger
 * /api/routines:
 *   post:
 *     summary: Create a new routine template
 *     tags: [Routine Templates]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoutineTemplateInput'
 *           examples:
 *             morning_routine:
 *               summary: Morning routine example
 *               value:
 *                 name: "Morning Productivity Routine"
 *                 description: "Start the day with focus and energy"
 *                 isActive: true
 *     responses:
 *       201:
 *         description: Routine template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "✅ Routine template created successfully"
 *                 routineTemplate:
 *                   $ref: '#/components/schemas/RoutineTemplate'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/", verifyToken, validateCreateRoutineTemplate, routineController.createRoutineTemplate);

/**
 * @swagger
 * /api/routines:
 *   get:
 *     summary: Get all routine templates for the authenticated user
 *     tags: [Routine Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: true
 *         description: Filter by active status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of routine templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RoutineTemplate'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 */
router.get("/", verifyToken, routineController.getRoutineTemplates);

/**
 * @swagger
 * /api/routines/{id}:
 *   get:
 *     summary: Get a specific routine template with its tasks
 *     tags: [Routine Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Routine template ID
 *     responses:
 *       200:
 *         description: Routine template with tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/RoutineTemplate'
 *                     - type: object
 *                       properties:
 *                         tasks:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/TemplateTask'
 *       404:
 *         description: Routine template not found
 */
router.get("/:id", verifyToken, routineController.getRoutineTemplate);

/**
 * @swagger
 * /api/routines/{id}:
 *   put:
 *     summary: Update a routine template
 *     tags: [Routine Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoutineTemplateInput'
 *     responses:
 *       200:
 *         description: Routine template updated successfully
 *       404:
 *         description: Routine template not found
 */
router.put("/:id", verifyToken, validateUpdateRoutineTemplate, routineController.updateRoutineTemplate);

/**
 * @swagger
 * /api/routines/{id}:
 *   delete:
 *     summary: Delete a routine template
 *     tags: [Routine Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Routine template deleted successfully
 *       404:
 *         description: Routine template not found
 */
router.delete("/:id", verifyToken, routineController.deleteRoutineTemplate);

// ============= TEMPLATE TASKS ROUTES =============

/**
 * @swagger
 * /api/routines/{routineId}/tasks:
 *   post:
 *     summary: Create a task in a routine template
 *     tags: [Template Tasks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routineId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TemplateTaskInput'
 *     responses:
 *       201:
 *         description: Template task created successfully
 */
router.post("/:routineId/tasks", verifyToken, validateCreateTemplateTask, routineController.createTemplateTask);

/**
 * @swagger
 * /api/routines/{routineId}/tasks/bulk:
 *   post:
 *     summary: Create multiple tasks in a routine template
 *     tags: [Template Tasks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routineId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tasks
 *             properties:
 *               tasks:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/TemplateTaskInput'
 *                 minItems: 1
 *                 maxItems: 20
 *           examples:
 *             morning_routine_tasks:
 *               summary: Morning routine tasks
 *               value:
 *                 tasks:
 *                   - title: "Wake up & Drink Water"
 *                     category: "rest"
 *                     timeStart: "06:00"
 *                     timeEnd: "06:05"
 *                     orderIndex: 0
 *                   - title: "Morning Exercise"
 *                     category: "rest"
 *                     timeStart: "06:05"
 *                     timeEnd: "06:35"
 *                     orderIndex: 1
 *                   - title: "Review Daily Goals"
 *                     category: "work"
 *                     timeStart: "06:35"
 *                     timeEnd: "06:45"
 *                     orderIndex: 2
 *     responses:
 *       201:
 *         description: Template tasks created successfully
 */
router.post("/:routineId/tasks/bulk", verifyToken, validateBulkCreateTemplateTasks, routineController.createMultipleTemplateTasks);

/**
 * @swagger
 * /api/routines/{routineId}/tasks:
 *   get:
 *     summary: Get all tasks for a routine template
 *     tags: [Template Tasks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routineId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: active
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: true
 *     responses:
 *       200:
 *         description: List of template tasks
 */
router.get("/:routineId/tasks", verifyToken, routineController.getTemplateTasks);

// ============= TEMPLATE TASK MANAGEMENT =============

/**
 * @swagger
 * /api/routines/tasks/{taskId}:
 *   put:
 *     summary: Update a template task
 *     tags: [Template Tasks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TemplateTaskInput'
 *     responses:
 *       200:
 *         description: Template task updated successfully
 */
router.put("/tasks/:taskId", verifyToken, validateUpdateTemplateTask, routineController.updateTemplateTask);

/**
 * @swagger
 * /api/routines/tasks/{taskId}:
 *   delete:
 *     summary: Delete a template task
 *     tags: [Template Tasks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Template task deleted successfully
 */
router.delete("/tasks/:taskId", verifyToken, routineController.deleteTemplateTask);

// ============= ROUTINE GENERATION ROUTES =============

/**
 * @swagger
 * /api/routines/{routineId}/generate:
 *   post:
 *     summary: Generate daily tasks from a specific routine template
 *     tags: [Routine Generation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routineId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Target date for generation (defaults to today)
 *                 example: "2025-11-07"
 *     responses:
 *       201:
 *         description: Tasks generated successfully
 *       400:
 *         description: Already generated or validation error
 */
router.post("/:routineId/generate", verifyToken, validateGenerateRoutine, routineController.generateRoutine);

/**
 * @swagger
 * /api/routines/generate-all:
 *   post:
 *     summary: Generate daily tasks from all active routine templates
 *     tags: [Routine Generation]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Target date for generation (defaults to today)
 *                 example: "2025-11-07"
 *     responses:
 *       201:
 *         description: Daily routines generated successfully
 */
router.post("/generate-all", verifyToken, validateGenerateRoutine, routineController.generateAllRoutines);

/**
 * @swagger
 * /api/routines/{routineId}/preview:
 *   get:
 *     summary: Preview what tasks would be generated from a routine template
 *     tags: [Routine Generation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routineId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Target date for preview (defaults to today)
 *     responses:
 *       200:
 *         description: Preview of tasks to be generated
 */
router.get("/:routineId/preview", verifyToken, routineController.previewGeneration);

/**
 * @swagger
 * /api/routines/generation-status:
 *   get:
 *     summary: Get routine generation status for a specific date
 *     tags: [Routine Generation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check status for (defaults to today)
 *     responses:
 *       200:
 *         description: Generation status summary
 */
router.get("/generation-status", verifyToken, routineController.getGenerationStatus);

/**
 * @swagger
 * /api/routines/{routineId}/delete-generated:
 *   delete:
 *     summary: Delete generated tasks for a specific routine and date
 *     tags: [Routine Generation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routineId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-11-07"
 *     responses:
 *       200:
 *         description: Generated tasks deleted successfully
 */
router.delete("/:routineId/delete-generated", verifyToken, validateDeleteGeneratedRoutine, routineController.deleteGeneratedRoutine);

// ============= GENERATION HISTORY & TRACKING =============

/**
 * @swagger
 * /api/routines/generation-history:
 *   get:
 *     summary: Get routine generation history
 *     tags: [Routine Generation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: routineId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific routine template
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for history range
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for history range
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 30
 *     responses:
 *       200:
 *         description: Generation history records
 */
router.get("/generation-history", verifyToken, routineController.getGenerationHistory);

/**
 * @swagger
 * /api/routines/generated-tasks:
 *   get:
 *     summary: Get generated tasks for a specific date
 *     tags: [Routine Generation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to get generated tasks for
 *       - in: query
 *         name: routineId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific routine template
 *     responses:
 *       200:
 *         description: List of generated tasks
 */
router.get("/generated-tasks", verifyToken, routineController.getGeneratedTasks);

// ============= SCHEDULER MANAGEMENT (Admin/Testing) =============

/**
 * @swagger
 * /api/routines/scheduler/status:
 *   get:
 *     summary: Get scheduler status
 *     tags: [Scheduler Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduler status information
 */
router.get("/scheduler/status", verifyToken, (req, res) => {
  try {
    const status = schedulerService.getSchedulerStatus();
    res.json({
      success: true,
      scheduler: status
    });
  } catch (error) {
    res.status(500).json({
      message: "❌ Failed to get scheduler status",
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/routines/scheduler/trigger:
 *   post:
 *     summary: Manually trigger daily routine generation for all users
 *     tags: [Scheduler Management]
 *     security:
 *       - BearerAuth: []
 *     description: This endpoint manually triggers the daily routine generation process for testing purposes
 *     responses:
 *       200:
 *         description: Manual generation completed
 */
router.post("/scheduler/trigger", verifyToken, async (req, res) => {
  try {
    const result = await schedulerService.triggerDailyGeneration();
    res.json({
      success: true,
      message: "Manual daily generation completed",
      result
    });
  } catch (error) {
    res.status(500).json({
      message: "❌ Failed to trigger manual generation",
      error: error.message
    });
  }
});

export default router;