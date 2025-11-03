// Custom Error Middleware
export const customErrorHandler = (err, req, res, next) => {
  // Default error response
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || undefined;

  // Validation error (from express-validator)
  if (err.name === 'ValidationError' || Array.isArray(errors)) {
    status = 400;
    message = 'Validation failed';
  }

  // JWT error
  if (err.name === 'UnauthorizedError') {
    status = 401;
    message = 'Invalid or expired token';
  }

  // Database error
  if (err.code === '23505') { // Postgres unique violation
    status = 400;
    message = 'Duplicate entry';
  }

  // Custom error (thrown with next({ status, message, errors }))
  if (err.isCustom) {
    status = err.status;
    message = err.message;
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR]', err);
  }

  res.status(status).json({
    status: 'error',
    message,
    errors,
  });
};
