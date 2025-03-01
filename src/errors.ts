/**
 * Custom error classes for the plugged-in-api client
 */

import { ErrorResponseData } from './types';

/**
 * Base API error class
 */
export class ApiError extends Error {
  statusCode: number;
  data: ErrorResponseData;

  constructor(message: string, statusCode = 0, data: ErrorResponseData = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Authentication error, typically for 401 responses
 */
export class AuthenticationError extends ApiError {
  constructor(message: string, statusCode = 401, data: ErrorResponseData = {}) {
    super(message, statusCode, data);
    this.name = 'AuthenticationError';
  }
}

/**
 * Validation error, typically for 400 responses
 */
export class ValidationError extends ApiError {
  constructor(message: string, statusCode = 400, data: ErrorResponseData = {}) {
    super(message, statusCode, data);
    this.name = 'ValidationError';
  }
}

/**
 * Network error, typically when no response is received
 */
export class NetworkError extends ApiError {
  constructor(message: string, statusCode = 0, data: ErrorResponseData = {}) {
    super(message, statusCode, data);
    this.name = 'NetworkError';
  }
}

/**
 * Rate limit error, typically for 429 responses
 */
export class RateLimitError extends ApiError {
  constructor(message: string, statusCode = 429, data: ErrorResponseData = {}) {
    super(message, statusCode, data);
    this.name = 'RateLimitError';
  }
}

/**
 * Server error, typically for 500 responses
 */
export class ServerError extends ApiError {
  constructor(message: string, statusCode = 500, data: ErrorResponseData = {}) {
    super(message, statusCode, data);
    this.name = 'ServerError';
  }
}
