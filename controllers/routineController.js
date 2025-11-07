import * as routineModel from '../models/routineModel.js';
import * as routineService from '../services/routineService.js';

// ============= ROUTINE TEMPLATES CONTROLLER =============

// Create routine template
export const createRoutineTemplate = async (req, res) => {
  try {
    const { name, description, isActive = true } = req.body;
    const userId = req.user.id;

    const routineTemplate = await routineModel.createRoutineTemplate(
      userId,
      name,
      description,
      isActive
    );

    res.status(201).json({
      message: "✅ Routine template created successfully",
      routineTemplate
    });
  } catch (error) {
    console.error('Error creating routine template:', error);
    res.status(500).json({
      message: "❌ Failed to create routine template",
      error: error.message
    });
  }
};

// Get all routine templates for user
export const getRoutineTemplates = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      active = 'true', 
      page = 1, 
      limit = 10 
    } = req.query;

    const isActive = active === 'true';
    const limitNum = parseInt(limit);
    const offset = (parseInt(page) - 1) * limitNum;

    const routineTemplates = await routineModel.getRoutineTemplatesByUser(userId, {
      isActive,
      limit: limitNum,
      offset
    });

    res.json({
      data: routineTemplates,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total: routineTemplates.length
      }
    });
  } catch (error) {
    console.error('Error fetching routine templates:', error);
    res.status(500).json({
      message: "❌ Failed to fetch routine templates",
      error: error.message
    });
  }
};

// Get routine template by ID with tasks
export const getRoutineTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const routineTemplate = await routineModel.getFullRoutineTemplate(id, userId);

    if (!routineTemplate) {
      return res.status(404).json({
        message: "❌ Routine template not found"
      });
    }

    res.json({
      data: routineTemplate
    });
  } catch (error) {
    console.error('Error fetching routine template:', error);
    res.status(500).json({
      message: "❌ Failed to fetch routine template",
      error: error.message
    });
  }
};

// Update routine template
export const updateRoutineTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const updatedTemplate = await routineModel.updateRoutineTemplate(id, userId, updates);

    if (!updatedTemplate) {
      return res.status(404).json({
        message: "❌ Routine template not found"
      });
    }

    res.json({
      message: "✅ Routine template updated successfully",
      routineTemplate: updatedTemplate
    });
  } catch (error) {
    console.error('Error updating routine template:', error);
    res.status(500).json({
      message: "❌ Failed to update routine template",
      error: error.message
    });
  }
};

// Delete routine template
export const deleteRoutineTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deletedTemplate = await routineModel.deleteRoutineTemplate(id, userId);

    if (!deletedTemplate) {
      return res.status(404).json({
        message: "❌ Routine template not found"
      });
    }

    res.json({
      message: "✅ Routine template deleted successfully",
      deletedTemplate
    });
  } catch (error) {
    console.error('Error deleting routine template:', error);
    res.status(500).json({
      message: "❌ Failed to delete routine template",
      error: error.message
    });
  }
};

// ============= TEMPLATE TASKS CONTROLLER =============

// Create template task
export const createTemplateTask = async (req, res) => {
  try {
    const { routineId } = req.params;
    const userId = req.user.id;
    const taskData = req.body;

    // Verify routine template belongs to user
    const routineTemplate = await routineModel.getRoutineTemplateById(routineId, userId);
    if (!routineTemplate) {
      return res.status(404).json({
        message: "❌ Routine template not found"
      });
    }

    const templateTask = await routineModel.createTemplateTask(routineId, taskData);

    res.status(201).json({
      message: "✅ Template task created successfully",
      templateTask
    });
  } catch (error) {
    console.error('Error creating template task:', error);
    res.status(500).json({
      message: "❌ Failed to create template task",
      error: error.message
    });
  }
};

// Create multiple template tasks
export const createMultipleTemplateTasks = async (req, res) => {
  try {
    const { routineId } = req.params;
    const userId = req.user.id;
    const { tasks } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        message: "❌ Tasks array is required and cannot be empty"
      });
    }

    // Verify routine template belongs to user
    const routineTemplate = await routineModel.getRoutineTemplateById(routineId, userId);
    if (!routineTemplate) {
      return res.status(404).json({
        message: "❌ Routine template not found"
      });
    }

    const createdTasks = await routineModel.createMultipleTemplateTasks(routineId, tasks);

    res.status(201).json({
      message: `✅ Successfully created ${createdTasks.length} template tasks`,
      templateTasks: createdTasks,
      count: createdTasks.length
    });
  } catch (error) {
    console.error('Error creating multiple template tasks:', error);
    res.status(500).json({
      message: "❌ Failed to create template tasks",
      error: error.message
    });
  }
};

// Get template tasks by routine ID
export const getTemplateTasks = async (req, res) => {
  try {
    const { routineId } = req.params;
    const userId = req.user.id;
    const { active = 'true' } = req.query;

    // Verify routine template belongs to user
    const routineTemplate = await routineModel.getRoutineTemplateById(routineId, userId);
    if (!routineTemplate) {
      return res.status(404).json({
        message: "❌ Routine template not found"
      });
    }

    const isActive = active === 'true';
    const templateTasks = await routineModel.getTemplateTasksByRoutineId(routineId, isActive);

    res.json({
      data: templateTasks,
      routineTemplate: {
        id: routineTemplate.id,
        name: routineTemplate.name
      }
    });
  } catch (error) {
    console.error('Error fetching template tasks:', error);
    res.status(500).json({
      message: "❌ Failed to fetch template tasks",
      error: error.message
    });
  }
};

// Update template task
export const updateTemplateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    // Verify template task belongs to user
    const templateTask = await routineModel.getTemplateTaskById(taskId);
    if (!templateTask || templateTask.user_id !== userId) {
      return res.status(404).json({
        message: "❌ Template task not found"
      });
    }

    const updatedTask = await routineModel.updateTemplateTask(taskId, updates);

    res.json({
      message: "✅ Template task updated successfully",
      templateTask: updatedTask
    });
  } catch (error) {
    console.error('Error updating template task:', error);
    res.status(500).json({
      message: "❌ Failed to update template task",
      error: error.message
    });
  }
};

// Delete template task
export const deleteTemplateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    // Verify template task belongs to user
    const templateTask = await routineModel.getTemplateTaskById(taskId);
    if (!templateTask || templateTask.user_id !== userId) {
      return res.status(404).json({
        message: "❌ Template task not found"
      });
    }

    const deletedTask = await routineModel.deleteTemplateTask(taskId);

    res.json({
      message: "✅ Template task deleted successfully",
      deletedTask
    });
  } catch (error) {
    console.error('Error deleting template task:', error);
    res.status(500).json({
      message: "❌ Failed to delete template task",
      error: error.message
    });
  }
};

// ============= ROUTINE GENERATION CONTROLLER =============

// Generate daily tasks from specific routine template
export const generateRoutine = async (req, res) => {
  try {
    const { routineId } = req.params;
    const userId = req.user.id;
    const { date } = req.body; // Optional target date

    const result = await routineService.generateDailyTasksFromTemplate(userId, routineId, date);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Error generating routine:', error);
    res.status(500).json({
      message: "❌ Failed to generate routine",
      error: error.message
    });
  }
};

// Generate all daily routines for user
export const generateAllRoutines = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.body; // Optional target date

    const result = await routineService.generateAllDailyRoutines(userId, date);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error generating all routines:', error);
    res.status(500).json({
      message: "❌ Failed to generate daily routines",
      error: error.message
    });
  }
};

// Get routine generation status
export const getGenerationStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query; // Optional target date

    const result = await routineService.getRoutineGenerationStatus(userId, date);

    res.json(result);
  } catch (error) {
    console.error('Error fetching generation status:', error);
    res.status(500).json({
      message: "❌ Failed to fetch generation status",
      error: error.message
    });
  }
};

// Preview routine generation
export const previewGeneration = async (req, res) => {
  try {
    const { routineId } = req.params;
    const userId = req.user.id;
    const { date } = req.query; // Optional target date

    const result = await routineService.previewRoutineGeneration(userId, routineId, date);

    res.json(result);
  } catch (error) {
    console.error('Error previewing routine generation:', error);
    res.status(500).json({
      message: "❌ Failed to preview routine generation",
      error: error.message
    });
  }
};

// Delete generated routine
export const deleteGeneratedRoutine = async (req, res) => {
  try {
    const { routineId } = req.params;
    const userId = req.user.id;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        message: "❌ Date is required"
      });
    }

    const result = await routineService.deleteGeneratedRoutine(userId, routineId, date);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error deleting generated routine:', error);
    res.status(500).json({
      message: "❌ Failed to delete generated routine",
      error: error.message
    });
  }
};

// Get routine generation history
export const getGenerationHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      routineId, 
      fromDate, 
      toDate, 
      page = 1, 
      limit = 30 
    } = req.query;

    const limitNum = parseInt(limit);
    const offset = (parseInt(page) - 1) * limitNum;

    const history = await routineModel.getRoutineGenerationHistory(userId, {
      routineTemplateId: routineId,
      fromDate,
      toDate,
      limit: limitNum,
      offset
    });

    res.json({
      data: history,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total: history.length
      }
    });
  } catch (error) {
    console.error('Error fetching generation history:', error);
    res.status(500).json({
      message: "❌ Failed to fetch generation history",
      error: error.message
    });
  }
};

// Get generated tasks for specific date
export const getGeneratedTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, routineId } = req.query;

    if (!date) {
      return res.status(400).json({
        message: "❌ Date parameter is required"
      });
    }

    const generatedTasks = await routineModel.getGeneratedTasksForDate(userId, date, routineId);

    res.json({
      data: generatedTasks,
      date,
      totalTasks: generatedTasks.length
    });
  } catch (error) {
    console.error('Error fetching generated tasks:', error);
    res.status(500).json({
      message: "❌ Failed to fetch generated tasks",
      error: error.message
    });
  }
};

export default {
  // Routine Templates
  createRoutineTemplate,
  getRoutineTemplates,
  getRoutineTemplate,
  updateRoutineTemplate,
  deleteRoutineTemplate,
  
  // Template Tasks
  createTemplateTask,
  createMultipleTemplateTasks,
  getTemplateTasks,
  updateTemplateTask,
  deleteTemplateTask,
  
  // Generation
  generateRoutine,
  generateAllRoutines,
  getGenerationStatus,
  previewGeneration,
  deleteGeneratedRoutine,
  getGenerationHistory,
  getGeneratedTasks
};