/**
 * Utility functions for the plugged-in-api client
 */

import { RequestParams } from './types';
import { ValidationError } from './errors';

/**
 * Builds a URL with query parameters
 * @param endpoint The API endpoint
 * @param params Query parameters
 * @returns The formatted URL
 */
export function buildUrl(endpoint: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return endpoint;
  }

  const url = new URL(endpoint, 'https://api.plugged.in');
  
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    
    if (typeof value === 'object') {
      url.searchParams.append(key, JSON.stringify(value));
    } else {
      url.searchParams.append(key, String(value));
    }
  });

  // Return just the pathname and search parts of the URL
  return url.pathname + url.search;
}

/**
 * Validates request parameters
 * @param params The parameters to validate
 * @throws ValidationError if parameters are invalid
 */
export function validateParams(params: RequestParams): void {
  if (!params || typeof params !== 'object') {
    throw new ValidationError('Parameters must be an object');
  }

  // Check if query is a valid string when present
  if (params.query !== undefined && params.query !== null) {
    if (typeof params.query !== 'string') {
      throw new ValidationError('Query parameter must be a string');
    }
    
    // Check if query is empty
    if (params.query === '') {
      throw new ValidationError('Query parameter cannot be empty');
    }
  }

  // Check pluggrid format when present
  if (params.pluggrid !== undefined && params.pluggrid !== null) {
    if (typeof params.pluggrid !== 'object') {
      throw new ValidationError('Pluggrid parameter must be an object');
    }
  }
}

/**
 * Safely parses JSON with error handling
 * @param data String data to parse
 * @returns Parsed JSON object or null if parsing failed
 */
export function safeJsonParse(data: string): any {
  try {
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Checks if a value is a plain object
 * @param value The value to check
 * @returns Boolean indicating if value is a plain object
 */
export function isPlainObject(value: any): boolean {
  return value !== null && 
         typeof value === 'object' && 
         !Array.isArray(value) &&
         Object.getPrototypeOf(value) === Object.prototype;
}
