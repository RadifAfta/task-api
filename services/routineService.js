import * as routineModel from '../models/routineModel.js';
import * as taskModel from '../models/taskModel.js';

/**
 * Daily Routine Generator Service
 * Handles automatic generation of daily tasks from routine templates
 */

// Generate daily tasks from a specific routine template
export const generateDailyTasksFromTemplate = async (userId, routineTemplateId, targetDate = null) => {
  const generationDate = targetDate ? new Date(targetDate) : new Date();
  const dateStr = generationDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  try {
    // Check if routine already generated for this date
    const existingGeneration = await routineModel.checkRoutineGenerated(userId, routineTemplateId, dateStr);
    if (existingGeneration) {
      return {
        success: false,
        message: `Routine already generated for ${dateStr}`,
        existingGeneration,
        tasksGenerated: 0
      };
    }
    
    // Get routine template with tasks
    const routineTemplate = await routineModel.getFullRoutineTemplate(routineTemplateId, userId);
    if (!routineTemplate) {
      throw new Error('Routine template not found or not accessible');
    }
    
    if (!routineTemplate.is_active) {
      throw new Error('Routine template is not active');
    }
    
    if (!routineTemplate.tasks || routineTemplate.tasks.length === 0) {
      throw new Error('Routine template has no active tasks');
    }
    
    // Generate tasks from template
    const generatedTasks = [];
    const generatedTaskRecords = [];
    
    for (const templateTask of routineTemplate.tasks) {
      if (!templateTask.is_active) continue;
      
      // Calculate due date (same day as generation date)
      const dueDate = dateStr;
      
      // Create task from template
      const newTask = await taskModel.createTask(
        userId,
        templateTask.title,
        templateTask.description || '',
        'pending', // Default status for generated tasks
        templateTask.priority,
        templateTask.category,
        dueDate,
        templateTask.time_start,
        templateTask.time_end
      );
      
      generatedTasks.push(newTask);
      
      // Create generated task record for tracking
      const generatedTaskRecord = await routineModel.createGeneratedTaskRecord(
        newTask.id,
        routineTemplateId,
        templateTask.id,
        dateStr
      );
      
      generatedTaskRecords.push(generatedTaskRecord);
    }
    
    // Create generation record
    const generationRecord = await routineModel.createRoutineGeneration(
      userId,
      routineTemplateId,
      dateStr,
      generatedTasks.length,
      'completed'
    );
    
    return {
      success: true,
      message: `Successfully generated ${generatedTasks.length} tasks from routine "${routineTemplate.name}"`,
      routineTemplate: {
        id: routineTemplate.id,
        name: routineTemplate.name,
        description: routineTemplate.description
      },
      generationRecord,
      tasksGenerated: generatedTasks.length,
      generatedTasks,
      generationDate: dateStr
    };
    
  } catch (error) {
    // Log failed generation
    try {
      await routineModel.createRoutineGeneration(
        userId,
        routineTemplateId,
        dateStr,
        0,
        'failed'
      );
    } catch (logError) {
      console.error('Failed to log generation failure:', logError);
    }
    
    throw error;
  }
};

// Generate daily tasks from all active routine templates for a user
export const generateAllDailyRoutines = async (userId, targetDate = null) => {
  const generationDate = targetDate ? new Date(targetDate) : new Date();
  const dateStr = generationDate.toISOString().split('T')[0];
  
  try {
    // Get all active routine templates for user
    const activeTemplates = await routineModel.getActiveRoutineTemplatesForGeneration(userId);
    
    if (activeTemplates.length === 0) {
      return {
        success: true,
        message: 'No active routine templates found',
        totalTemplates: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        skippedGenerations: 0,
        totalTasksGenerated: 0,
        results: []
      };
    }
    
    const results = [];
    let successfulGenerations = 0;
    let failedGenerations = 0;
    let skippedGenerations = 0;
    let totalTasksGenerated = 0;
    
    // Generate tasks for each routine template
    for (const template of activeTemplates) {
      try {
        const result = await generateDailyTasksFromTemplate(userId, template.id, targetDate);
        
        if (result.success) {
          if (result.tasksGenerated > 0) {
            successfulGenerations++;
            totalTasksGenerated += result.tasksGenerated;
          } else {
            skippedGenerations++; // Already generated
          }
        } else {
          skippedGenerations++;
        }
        
        results.push({
          templateId: template.id,
          templateName: template.name,
          status: result.success ? (result.tasksGenerated > 0 ? 'generated' : 'skipped') : 'failed',
          tasksGenerated: result.tasksGenerated || 0,
          message: result.message,
          error: null
        });
        
      } catch (error) {
        failedGenerations++;
        results.push({
          templateId: template.id,
          templateName: template.name,
          status: 'failed',
          tasksGenerated: 0,
          message: `Failed to generate routine`,
          error: error.message
        });
      }
    }
    
    return {
      success: true,
      message: `Daily routine generation completed for ${dateStr}`,
      generationDate: dateStr,
      totalTemplates: activeTemplates.length,
      successfulGenerations,
      failedGenerations,
      skippedGenerations,
      totalTasksGenerated,
      results
    };
    
  } catch (error) {
    throw new Error(`Failed to generate daily routines: ${error.message}`);
  }
};

// Get routine generation status for a date
export const getRoutineGenerationStatus = async (userId, targetDate = null) => {
  const generationDate = targetDate ? new Date(targetDate) : new Date();
  const dateStr = generationDate.toISOString().split('T')[0];
  
  try {
    // Get all active routine templates
    const activeTemplates = await routineModel.getActiveRoutineTemplatesForGeneration(userId);
    
    // Get generation history for the date
    const generationHistory = await routineModel.getRoutineGenerationHistory(userId, {
      fromDate: dateStr,
      toDate: dateStr
    });
    
    // Get generated tasks for the date
    const generatedTasks = await routineModel.getGeneratedTasksForDate(userId, dateStr);
    
    // Build status summary
    const templateStatus = activeTemplates.map(template => {
      const generation = generationHistory.find(g => g.routine_template_id === template.id);
      const tasks = generatedTasks.filter(t => t.routine_template_id === template.id);
      
      return {
        templateId: template.id,
        templateName: template.name,
        tasksCount: template.tasks_count,
        isGenerated: !!generation,
        generationStatus: generation?.generation_status || 'not_generated',
        tasksGenerated: generation?.tasks_generated || 0,
        actualTasksCount: tasks.length,
        generatedAt: generation?.created_at || null
      };
    });
    
    const summary = {
      date: dateStr,
      totalTemplates: activeTemplates.length,
      generatedTemplates: templateStatus.filter(t => t.isGenerated).length,
      pendingTemplates: templateStatus.filter(t => !t.isGenerated).length,
      totalTasksGenerated: generatedTasks.length,
      templateStatus
    };
    
    return {
      success: true,
      summary,
      generatedTasks: generatedTasks.map(task => ({
        id: task.id,
        title: task.title,
        category: task.category,
        priority: task.priority,
        status: task.status,
        timeStart: task.time_start,
        timeEnd: task.time_end,
        routineName: task.routine_name,
        routineTemplateId: task.routine_template_id
      }))
    };
    
  } catch (error) {
    throw new Error(`Failed to get routine generation status: ${error.message}`);
  }
};

// Preview what tasks would be generated from a routine template
export const previewRoutineGeneration = async (userId, routineTemplateId, targetDate = null) => {
  const generationDate = targetDate ? new Date(targetDate) : new Date();
  const dateStr = generationDate.toISOString().split('T')[0];
  
  try {
    // Get routine template with tasks
    const routineTemplate = await routineModel.getFullRoutineTemplate(routineTemplateId, userId);
    if (!routineTemplate) {
      throw new Error('Routine template not found or not accessible');
    }
    
    // Check if already generated
    const existingGeneration = await routineModel.checkRoutineGenerated(userId, routineTemplateId, dateStr);
    
    // Build preview tasks
    const previewTasks = routineTemplate.tasks
      .filter(task => task.is_active)
      .map((templateTask, index) => ({
        templateTaskId: templateTask.id,
        title: templateTask.title,
        description: templateTask.description,
        category: templateTask.category,
        priority: templateTask.priority,
        timeStart: templateTask.time_start,
        timeEnd: templateTask.time_end,
        estimatedDuration: templateTask.estimated_duration,
        orderIndex: templateTask.order_index,
        dueDate: dateStr,
        status: 'pending' // Default status for generated tasks
      }))
      .sort((a, b) => a.orderIndex - b.orderIndex);
    
    return {
      success: true,
      routineTemplate: {
        id: routineTemplate.id,
        name: routineTemplate.name,
        description: routineTemplate.description,
        isActive: routineTemplate.is_active
      },
      targetDate: dateStr,
      isAlreadyGenerated: !!existingGeneration,
      existingGeneration,
      previewTasks,
      tasksToGenerate: previewTasks.length
    };
    
  } catch (error) {
    throw new Error(`Failed to preview routine generation: ${error.message}`);
  }
};

// Delete generated tasks for a specific date and routine
export const deleteGeneratedRoutine = async (userId, routineTemplateId, targetDate) => {
  const dateStr = new Date(targetDate).toISOString().split('T')[0];
  
  try {
    // Get generated tasks for the date
    const generatedTasks = await routineModel.getGeneratedTasksForDate(userId, dateStr, routineTemplateId);
    
    if (generatedTasks.length === 0) {
      return {
        success: false,
        message: 'No generated tasks found for the specified date and routine',
        deletedTasks: 0
      };
    }
    
    let deletedTasks = 0;
    
    // Delete each generated task
    for (const task of generatedTasks) {
      await taskModel.deleteTask(task.id, userId);
      deletedTasks++;
    }
    
    // Remove generation record
    // Note: This will cascade delete routine_generated_tasks due to foreign key constraints
    await routineModel.createRoutineGeneration(userId, routineTemplateId, dateStr, 0, 'deleted');
    
    return {
      success: true,
      message: `Successfully deleted ${deletedTasks} generated tasks`,
      deletedTasks,
      date: dateStr
    };
    
  } catch (error) {
    throw new Error(`Failed to delete generated routine: ${error.message}`);
  }
};

// CRUD Operations for Routine Templates

/**
 * Get routine templates by user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @param {boolean|null} options.isActive - Filter by active status
 * @param {number} options.limit - Limit results
 * @returns {Object} Routine templates result
 */
const getRoutineTemplatesByUser = async (userId, options = {}) => {
  try {
    const routines = await routineModel.getRoutineTemplatesByUser(userId, options);
    return {
      success: true,
      routines: routines
    };
  } catch (error) {
    console.error('Error getting routine templates:', error);
    return {
      success: false,
      error: error.message,
      routines: []
    };
  }
};

/**
 * Get routine template by ID
 * @param {string} routineId - Routine template ID
 * @param {string} userId - User ID
 * @returns {Object} Routine template result
 */
const getRoutineTemplateById = async (routineId, userId) => {
  try {
    const routine = await routineModel.getRoutineTemplateById(routineId, userId);

    if (!routine) {
      return {
        success: false,
        error: 'Routine template not found',
        routine: null
      };
    }

    return {
      success: true,
      routine: routine
    };
  } catch (error) {
    console.error('Error getting routine template by ID:', error);
    return {
      success: false,
      error: error.message,
      routine: null
    };
  }
};

/**
 * Create routine template
 * @param {string} userId - User ID
 * @param {Object} routineData - Routine data
 * @param {string} routineData.name - Routine name
 * @param {string} routineData.description - Routine description
 * @param {boolean} routineData.isActive - Active status
 * @returns {Object} Creation result
 */
const createRoutineTemplate = async (userId, routineData) => {
  try {
    const routine = await routineModel.createRoutineTemplate(userId, routineData);

    return {
      success: true,
      routine: routine
    };
  } catch (error) {
    console.error('Error creating routine template:', error);
    return {
      success: false,
      error: error.message,
      routine: null
    };
  }
};

/**
 * Update routine template
 * @param {string} routineId - Routine template ID
 * @param {string} userId - User ID
 * @param {Object} updateData - Update data
 * @returns {Object} Update result
 */
const updateRoutineTemplate = async (routineId, userId, updateData) => {
  try {
    const routine = await routineModel.updateRoutineTemplate(routineId, userId, updateData);

    if (!routine) {
      return {
        success: false,
        error: 'Routine template not found or access denied',
        routine: null
      };
    }

    return {
      success: true,
      routine: routine
    };
  } catch (error) {
    console.error('Error updating routine template:', error);
    return {
      success: false,
      error: error.message,
      routine: null
    };
  }
};

/**
 * Delete routine template
 * @param {string} routineId - Routine template ID
 * @param {string} userId - User ID
 * @returns {Object} Deletion result
 */
const deleteRoutineTemplate = async (routineId, userId) => {
  try {
    const deleted = await routineModel.deleteRoutineTemplate(routineId, userId);

    if (!deleted) {
      return {
        success: false,
        error: 'Routine template not found or access denied'
      };
    }

    return {
      success: true,
      routine: deleted
    };
  } catch (error) {
    console.error('Error deleting routine template:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Activate routine template
 * @param {string} routineId - Routine template ID
 * @param {string} userId - User ID
 * @returns {Object} Activation result
 */
const activateRoutineTemplate = async (routineId, userId) => {
  return updateRoutineTemplate(routineId, userId, { is_active: true });
};

/**
 * Deactivate routine template
 * @param {string} routineId - Routine template ID
 * @param {string} userId - User ID
 * @returns {Object} Deactivation result
 */
const deactivateRoutineTemplate = async (routineId, userId) => {
  return updateRoutineTemplate(routineId, userId, { is_active: false });
};

/**
 * Get active routines for generation
 * @param {string} userId - User ID
 * @returns {Object} Active routines result
 */
const getActiveRoutinesForGeneration = async (userId) => {
  try {
    const routines = await routineModel.getActiveRoutineTemplates(userId);

    return {
      success: true,
      routines: routines
    };
  } catch (error) {
    console.error('Error getting active routines for generation:', error);
    return {
      success: false,
      error: error.message,
      routines: []
    };
  }
};

/**
 * Get routine tasks
 * @param {string} routineId - Routine template ID
 * @param {string} userId - User ID
 * @returns {Object} Routine tasks result
 */
const getRoutineTasks = async (routineId, userId) => {
  try {
    const tasks = await routineModel.getRoutineTemplateTasks(routineId, userId);

    return {
      success: true,
      tasks: tasks
    };
  } catch (error) {
    console.error('Error getting routine tasks:', error);
    return {
      success: false,
      error: error.message,
      tasks: []
    };
  }
};

/**
 * Create routine task
 * @param {string} routineId - Routine template ID
 * @param {Object} taskData - Task data
 * @returns {Object} Creation result
 */
const createRoutineTask = async (routineId, taskData) => {
  try {
    const task = await routineModel.createRoutineTemplateTask(routineId, taskData);

    return {
      success: true,
      task: task
    };
  } catch (error) {
    console.error('Error creating routine task:', error);
    return {
      success: false,
      error: error.message,
      task: null
    };
  }
};

export default {
  generateDailyTasksFromTemplate,
  generateAllDailyRoutines,
  getRoutineGenerationStatus,
  previewRoutineGeneration,
  deleteGeneratedRoutine,

  // CRUD Operations for Routine Templates
  getRoutineTemplatesByUser,
  getRoutineTemplateById,
  createRoutineTemplate,
  updateRoutineTemplate,
  deleteRoutineTemplate,
  activateRoutineTemplate,
  deactivateRoutineTemplate,
  getActiveRoutinesForGeneration,
  getRoutineTasks,
  createRoutineTask
};