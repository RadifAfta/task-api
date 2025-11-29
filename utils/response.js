/**
 * Standard Response Utilities
 * Provides consistent response formats across the application
 */

// Standard success response
export const successResponse = (data, message = null, meta = null) => {
  const response = {
    success: true,
    data: data
  };

  if (message) response.message = message;
  if (meta) response.meta = meta;

  return response;
};

// Standard error response
export const errorResponse = (error, message = null, code = null) => {
  const response = {
    success: false,
    error: error
  };

  if (message) response.message = message;
  if (code) response.code = code;

  return response;
};

// Standard pagination response
export const paginationResponse = (data, pagination) => {
  return {
    success: true,
    data: data,
    pagination: pagination
  };
};

// Service response wrapper
export const serviceResponse = (success, data = null, error = null, message = null) => {
  const response = { success };

  if (success) {
    if (data !== null) response.data = data;
  } else {
    if (error !== null) response.error = error;
  }

  if (message) response.message = message;

  return response;
};

// API response wrapper for Express
export const apiResponse = (res, statusCode, success, data = null, message = null, error = null) => {
  const response = { success };

  if (success) {
    if (data !== null) response.data = data;
    if (message) response.message = message;
  } else {
    if (error !== null) response.error = error;
    if (message) response.message = message;
  }

  return res.status(statusCode).json(response);
};

// Telegram response wrapper
export const telegramResponse = (success, data = null, error = null, message = null) => {
  return serviceResponse(success, data, error, message);
};

export default {
  successResponse,
  errorResponse,
  paginationResponse,
  serviceResponse,
  apiResponse,
  telegramResponse
};