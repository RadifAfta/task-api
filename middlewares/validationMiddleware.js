import { body, param, query, validationResult } from 'express-validator';

// Middleware untuk menangani hasil validasi
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Validation rules untuk Authentication
export const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Name must be between 3-50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Name can only contain letters, numbers, underscore, and dash'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email must not exceed 100 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6, max: 100 })
    .withMessage('Password must be between 6-100 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  handleValidationErrors
];

export const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Validation rules untuk Tasks
export const validateCreateTask = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1-200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'done'])
    .withMessage('Status must be one of: pending, in_progress, done'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high'),
  body('category')
    .optional()
    .isIn(['work', 'learn', 'rest'])
    .withMessage('Category must be one of: work, learn, rest'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date in ISO 8601 format (YYYY-MM-DD)')
    .custom((value) => {
      if (value && new Date(value) < new Date().setHours(0, 0, 0, 0)) {
        throw new Error('Due date cannot be in the past');
      }
      return true;
    }),
  body('timeStart')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time start must be in HH:MM format (24-hour)'),
  body('timeEnd')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time end must be in HH:MM format (24-hour)')
    .custom((value, { req }) => {
      if (value && req.body.timeStart) {
        const startTime = new Date(`2000-01-01 ${req.body.timeStart}`);
        const endTime = new Date(`2000-01-01 ${value}`);
        if (endTime <= startTime) {
          throw new Error('Time end must be after time start');
        }
      }
      return true;
    }),
  handleValidationErrors
];

export const validateUpdateTask = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty if provided')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1-200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'done'])
    .withMessage('Status must be one of: pending, in_progress, done'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high'),
  body('category')
    .optional()
    .isIn(['work', 'learn', 'rest'])
    .withMessage('Category must be one of: work, learn, rest'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date in ISO 8601 format (YYYY-MM-DD)')
    .custom((value) => {
      if (value && new Date(value) < new Date().setHours(0, 0, 0, 0)) {
        throw new Error('Due date cannot be in the past');
      }
      return true;
    }),
  body('timeStart')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time start must be in HH:MM format (24-hour)'),
  body('timeEnd')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time end must be in HH:MM format (24-hour)')
    .custom((value, { req }) => {
      if (value && req.body.timeStart) {
        const startTime = new Date(`2000-01-01 ${req.body.timeStart}`);
        const endTime = new Date(`2000-01-01 ${value}`);
        if (endTime <= startTime) {
          throw new Error('Time end must be after time start');
        }
      }
      return true;
    }),
  handleValidationErrors
];

// Validation untuk URL parameters
export const validateTaskId = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Task ID is required')
    .isUUID()
    .withMessage('Task ID must be a valid UUID'),
  handleValidationErrors
];

export const validateUserId = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  handleValidationErrors
];

// Validation untuk Query parameters (pagination, filtering)
export const validateTaskQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('status')
    .optional()
    .isIn(['pending', 'in_progress', 'done'])
    .withMessage('Status must be one of: pending, in_progress, done'),
  query('category')
    .optional()
    .isIn(['work', 'learn', 'rest'])
    .withMessage('Category must be one of: work, learn, rest'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term must not exceed 100 characters')
    .escape(), // Sanitize untuk mencegah XSS
  handleValidationErrors
];

// Validation untuk Admin endpoints
export const validateRoleAssignment = [
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['user', 'admin'])
    .withMessage('Role must be either "user" or "admin"'),
  handleValidationErrors
];

// ============= ROUTINE VALIDATION RULES =============

// Validation rules untuk Routine Template
export const validateCreateRoutineTemplate = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Routine name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Routine name must be between 1-100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  handleValidationErrors
];

export const validateUpdateRoutineTemplate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Routine name must be between 1-100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  handleValidationErrors
];

// Validation rules untuk Template Task
export const validateCreateTemplateTask = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Task title must be between 1-255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('category')
    .optional()
    .isIn(['work', 'learn', 'rest'])
    .withMessage('Category must be one of: work, learn, rest'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high'),
  body('timeStart')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time start must be in HH:MM format (24-hour)'),
  body('timeEnd')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time end must be in HH:MM format (24-hour)')
    .custom((value, { req }) => {
      if (value && req.body.timeStart) {
        const startTime = new Date(`2000-01-01 ${req.body.timeStart}`);
        const endTime = new Date(`2000-01-01 ${value}`);
        if (endTime <= startTime) {
          throw new Error('End time must be after start time');
        }
      }
      return true;
    }),
  body('estimatedDuration')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('Estimated duration must be between 1-1440 minutes (24 hours)'),
  body('orderIndex')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order index must be a non-negative integer'),
  handleValidationErrors
];

export const validateUpdateTemplateTask = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Task title must be between 1-255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('category')
    .optional()
    .isIn(['work', 'learn', 'rest'])
    .withMessage('Category must be one of: work, learn, rest'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high'),
  body('timeStart')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time start must be in HH:MM format (24-hour)'),
  body('timeEnd')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time end must be in HH:MM format (24-hour)')
    .custom((value, { req }) => {
      if (value && req.body.timeStart) {
        const startTime = new Date(`2000-01-01 ${req.body.timeStart}`);
        const endTime = new Date(`2000-01-01 ${value}`);
        if (endTime <= startTime) {
          throw new Error('End time must be after start time');
        }
      }
      return true;
    }),
  body('estimatedDuration')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('Estimated duration must be between 1-1440 minutes (24 hours)'),
  body('orderIndex')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order index must be a non-negative integer'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  handleValidationErrors
];

// Validation rules untuk Bulk Create Template Tasks
export const validateBulkCreateTemplateTasks = [
  body('tasks')
    .isArray({ min: 1, max: 20 })
    .withMessage('Tasks array is required and must contain 1-20 tasks'),
  body('tasks.*.title')
    .trim()
    .notEmpty()
    .withMessage('Each task must have a title')
    .isLength({ min: 1, max: 255 })
    .withMessage('Task title must be between 1-255 characters'),
  body('tasks.*.description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Task description must not exceed 500 characters'),
  body('tasks.*.category')
    .optional()
    .isIn(['work', 'learn', 'rest'])
    .withMessage('Task category must be one of: work, learn, rest'),
  body('tasks.*.priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Task priority must be one of: low, medium, high'),
  body('tasks.*.timeStart')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Task time start must be in HH:MM format (24-hour)'),
  body('tasks.*.timeEnd')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Task time end must be in HH:MM format (24-hour)')
    .custom((value, { req, path }) => {
      // Extract array index from path (e.g., "tasks[0].timeEnd" -> 0)
      const indexMatch = path.match(/tasks\[(\d+)\]/);
      if (indexMatch && value) {
        const index = parseInt(indexMatch[1]);
        const timeStart = req.body.tasks[index]?.timeStart;
        if (timeStart) {
          const startTime = new Date(`2000-01-01 ${timeStart}`);
          const endTime = new Date(`2000-01-01 ${value}`);
          if (endTime <= startTime) {
            throw new Error(`Task ${index + 1}: End time must be after start time`);
          }
        }
      }
      return true;
    }),
  body('tasks.*.estimatedDuration')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('Estimated duration must be between 1-1440 minutes'),
  body('tasks.*.orderIndex')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order index must be a non-negative integer'),
  handleValidationErrors
];

// Validation rules untuk Routine Generation
export const validateGenerateRoutine = [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid date in ISO 8601 format (YYYY-MM-DD)')
    .custom((value) => {
      if (value) {
        const inputDate = new Date(value);
        const today = new Date();
        const maxFutureDate = new Date();
        maxFutureDate.setDate(today.getDate() + 30); // Allow generation up to 30 days in future
        
        if (inputDate > maxFutureDate) {
          throw new Error('Cannot generate routines more than 30 days in the future');
        }
      }
      return true;
    }),
  handleValidationErrors
];

// Validation rules untuk Delete Generated Routine
export const validateDeleteGeneratedRoutine = [
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Date must be a valid date in ISO 8601 format (YYYY-MM-DD)')
    .custom((value) => {
      if (value) {
        const inputDate = new Date(value);
        const today = new Date();
        const minPastDate = new Date();
        minPastDate.setDate(today.getDate() - 90); // Allow deletion up to 90 days in past
        
        if (inputDate < minPastDate) {
          throw new Error('Cannot delete routines older than 90 days');
        }
        
        if (inputDate > today) {
          throw new Error('Cannot delete future routine generations');
        }
      }
      return true;
    }),
  handleValidationErrors
];
