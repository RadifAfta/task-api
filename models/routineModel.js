import { pool } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

// ============= ROUTINE TEMPLATES =============

// CREATE routine template
export const createRoutineTemplate = async (userId, name, description, isActive = true) => {
  const id = uuidv4();
  const result = await pool.query(
    `INSERT INTO routine_templates (id, user_id, name, description, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, userId, name, description, isActive]
  );
  return result.rows[0];
};

// GET routine templates by user
export const getRoutineTemplatesByUser = async (userId, options = {}) => {
  const { isActive = true, limit = 50, offset = 0 } = options;
  
  let query = `
    SELECT rt.*, 
           COUNT(rtt.id) as tasks_count,
           CASE 
             WHEN COUNT(rtt.id) > 0 THEN true 
             ELSE false 
           END as has_tasks
    FROM routine_templates rt
    LEFT JOIN routine_template_tasks rtt ON rt.id = rtt.routine_template_id AND rtt.is_active = true
    WHERE rt.user_id = $1
  `;
  
  const params = [userId];
  let paramIndex = 2;
  
  if (isActive !== null) {
    query += ` AND rt.is_active = $${paramIndex}`;
    params.push(isActive);
    paramIndex++;
  }
  
  query += `
    GROUP BY rt.id, rt.user_id, rt.name, rt.description, rt.is_active, rt.created_at, rt.updated_at
    ORDER BY rt.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  params.push(limit, offset);
  
  const result = await pool.query(query, params);
  return result.rows;
};

// GET routine template by ID
export const getRoutineTemplateById = async (templateId, userId) => {
  const result = await pool.query(
    `SELECT rt.*, 
            COUNT(rtt.id) as tasks_count
     FROM routine_templates rt
     LEFT JOIN routine_template_tasks rtt ON rt.id = rtt.routine_template_id AND rtt.is_active = true
     WHERE rt.id = $1 AND rt.user_id = $2
     GROUP BY rt.id`,
    [templateId, userId]
  );
  return result.rows[0];
};

// UPDATE routine template
export const updateRoutineTemplate = async (templateId, userId, updates) => {
  const { name, description, isActive } = updates;
  
  const result = await pool.query(
    `UPDATE routine_templates 
     SET name = COALESCE($3, name),
         description = COALESCE($4, description),
         is_active = COALESCE($5, is_active),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [templateId, userId, name, description, isActive]
  );
  return result.rows[0];
};

// DELETE routine template
export const deleteRoutineTemplate = async (templateId, userId) => {
  const result = await pool.query(
    `DELETE FROM routine_templates 
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [templateId, userId]
  );
  return result.rows[0];
};

// ============= ROUTINE TEMPLATE TASKS =============

// CREATE template task
export const createTemplateTask = async (routineTemplateId, taskData) => {
  const { title, description, category = 'work', priority = 'medium', timeStart, timeEnd, estimatedDuration, orderIndex = 0 } = taskData;
  const id = uuidv4();
  
  const result = await pool.query(
    `INSERT INTO routine_template_tasks 
     (id, routine_template_id, title, description, category, priority, time_start, time_end, estimated_duration, order_index)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [id, routineTemplateId, title, description, category, priority, timeStart, timeEnd, estimatedDuration, orderIndex]
  );
  return result.rows[0];
};

// GET template tasks by routine template ID
export const getTemplateTasksByRoutineId = async (routineTemplateId, isActive = true) => {
  const result = await pool.query(
    `SELECT * FROM routine_template_tasks 
     WHERE routine_template_id = $1 AND is_active = $2
     ORDER BY order_index ASC, created_at ASC`,
    [routineTemplateId, isActive]
  );
  return result.rows;
};

// GET template task by ID
export const getTemplateTaskById = async (taskId) => {
  const result = await pool.query(
    `SELECT rtt.*, rt.user_id
     FROM routine_template_tasks rtt
     JOIN routine_templates rt ON rtt.routine_template_id = rt.id
     WHERE rtt.id = $1`,
    [taskId]
  );
  return result.rows[0];
};

// UPDATE template task
export const updateTemplateTask = async (taskId, updates) => {
  const { title, description, category, priority, timeStart, timeEnd, estimatedDuration, orderIndex, isActive } = updates;
  
  const result = await pool.query(
    `UPDATE routine_template_tasks 
     SET title = COALESCE($2, title),
         description = COALESCE($3, description),
         category = COALESCE($4, category),
         priority = COALESCE($5, priority),
         time_start = COALESCE($6, time_start),
         time_end = COALESCE($7, time_end),
         estimated_duration = COALESCE($8, estimated_duration),
         order_index = COALESCE($9, order_index),
         is_active = COALESCE($10, is_active),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [taskId, title, description, category, priority, timeStart, timeEnd, estimatedDuration, orderIndex, isActive]
  );
  return result.rows[0];
};

// DELETE template task
export const deleteTemplateTask = async (taskId) => {
  const result = await pool.query(
    `DELETE FROM routine_template_tasks 
     WHERE id = $1
     RETURNING *`,
    [taskId]
  );
  return result.rows[0];
};

// BULK CREATE template tasks
export const createMultipleTemplateTasks = async (routineTemplateId, tasksData) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const createdTasks = [];
    
    for (let i = 0; i < tasksData.length; i++) {
      const taskData = {
        ...tasksData[i],
        orderIndex: tasksData[i].orderIndex || i
      };
      
      const task = await createTemplateTask(routineTemplateId, taskData);
      createdTasks.push(task);
    }
    
    await client.query('COMMIT');
    return createdTasks;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============= DAILY ROUTINE GENERATIONS =============

// CREATE generation record
export const createRoutineGeneration = async (userId, routineTemplateId, generationDate, tasksGenerated = 0, status = 'completed') => {
  const id = uuidv4();
  
  try {
    const result = await pool.query(
      `INSERT INTO daily_routine_generations (id, user_id, routine_template_id, generation_date, tasks_generated, generation_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, userId, routineTemplateId, generationDate, tasksGenerated, status]
    );
    return result.rows[0];
  } catch (error) {
    // Handle unique constraint violation (duplicate generation)
    if (error.code === '23505') {
      return null; // Already generated for this date
    }
    throw error;
  }
};

// CHECK if routine already generated for date
export const checkRoutineGenerated = async (userId, routineTemplateId, generationDate) => {
  const result = await pool.query(
    `SELECT * FROM daily_routine_generations 
     WHERE user_id = $1 AND routine_template_id = $2 AND generation_date = $3`,
    [userId, routineTemplateId, generationDate]
  );
  return result.rows[0];
};

// GET generation history
export const getRoutineGenerationHistory = async (userId, options = {}) => {
  const { routineTemplateId, limit = 30, offset = 0, fromDate, toDate } = options;
  
  let query = `
    SELECT drg.*, rt.name as routine_name
    FROM daily_routine_generations drg
    JOIN routine_templates rt ON drg.routine_template_id = rt.id
    WHERE drg.user_id = $1
  `;
  
  const params = [userId];
  let paramIndex = 2;
  
  if (routineTemplateId) {
    query += ` AND drg.routine_template_id = $${paramIndex}`;
    params.push(routineTemplateId);
    paramIndex++;
  }
  
  if (fromDate) {
    query += ` AND drg.generation_date >= $${paramIndex}`;
    params.push(fromDate);
    paramIndex++;
  }
  
  if (toDate) {
    query += ` AND drg.generation_date <= $${paramIndex}`;
    params.push(toDate);
    paramIndex++;
  }
  
  query += `
    ORDER BY drg.generation_date DESC, drg.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  params.push(limit, offset);
  
  const result = await pool.query(query, params);
  return result.rows;
};

// ============= ROUTINE GENERATED TASKS =============

// CREATE generated task record
export const createGeneratedTaskRecord = async (taskId, routineTemplateId, templateTaskId, generationDate) => {
  const id = uuidv4();
  
  const result = await pool.query(
    `INSERT INTO routine_generated_tasks (id, task_id, routine_template_id, template_task_id, generation_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, taskId, routineTemplateId, templateTaskId, generationDate]
  );
  return result.rows[0];
};

// GET generated tasks for date
export const getGeneratedTasksForDate = async (userId, generationDate, routineTemplateId = null) => {
  let query = `
    SELECT t.*, rgt.routine_template_id, rgt.template_task_id, rt.name as routine_name
    FROM tasks t
    JOIN routine_generated_tasks rgt ON t.id = rgt.task_id
    JOIN routine_templates rt ON rgt.routine_template_id = rt.id
    WHERE t.user_id = $1 AND rgt.generation_date = $2
  `;
  
  const params = [userId, generationDate];
  
  if (routineTemplateId) {
    query += ` AND rgt.routine_template_id = $3`;
    params.push(routineTemplateId);
  }
  
  query += ` ORDER BY t.time_start ASC, t.created_at ASC`;
  
  const result = await pool.query(query, params);
  return result.rows;
};

// ============= UTILITY FUNCTIONS =============

// GET full routine template with tasks
export const getFullRoutineTemplate = async (templateId, userId) => {
  const template = await getRoutineTemplateById(templateId, userId);
  if (!template) return null;
  
  const tasks = await getTemplateTasksByRoutineId(templateId);
  
  return {
    ...template,
    tasks
  };
};

// GET active routine templates for user (for daily generation)
export const getActiveRoutineTemplatesForGeneration = async (userId) => {
  const result = await pool.query(
    `SELECT rt.*, 
            COUNT(rtt.id) as tasks_count
     FROM routine_templates rt
     LEFT JOIN routine_template_tasks rtt ON rt.id = rtt.routine_template_id AND rtt.is_active = true
     WHERE rt.user_id = $1 AND rt.is_active = true
     GROUP BY rt.id
     HAVING COUNT(rtt.id) > 0
     ORDER BY rt.created_at ASC`,
    [userId]
  );
  return result.rows;
};

export default {
  // Routine Templates
  createRoutineTemplate,
  getRoutineTemplatesByUser,
  getRoutineTemplateById,
  updateRoutineTemplate,
  deleteRoutineTemplate,
  
  // Template Tasks
  createTemplateTask,
  getTemplateTasksByRoutineId,
  getTemplateTaskById,
  updateTemplateTask,
  deleteTemplateTask,
  createMultipleTemplateTasks,
  
  // Generation Tracking
  createRoutineGeneration,
  checkRoutineGenerated,
  getRoutineGenerationHistory,
  
  // Generated Tasks
  createGeneratedTaskRecord,
  getGeneratedTasksForDate,
  
  // Utilities
  getFullRoutineTemplate,
  getActiveRoutineTemplatesForGeneration
};