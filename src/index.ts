/**
 * Main entry point for the query client
 * @module query
 */

import { PluggedInClient } from './client';
import * as TypesModule from './types';
import * as ErrorsModule from './errors';

// Re-export individual types for convenience
import { 
  PluggedInOptions,
  RequestConfig,
  RequestParams,
  ResponseData,
  PluggridConfig,
  RawQueryOptions,
  ErrorResponseData
} from './types';

// Re-export individual errors for convenience
import {
  ApiError,
  AuthenticationError,
  ValidationError,
  NetworkError,
  RateLimitError,
  ServerError
} from './errors';

// Export the client
export { PluggedInClient };

// Export Types namespace for backward compatibility
export const Types = TypesModule;

// Export individual types
export {
  PluggedInOptions,
  RequestConfig,
  RequestParams,
  ResponseData,
  PluggridConfig,
  RawQueryOptions,
  ErrorResponseData
};

// Export errors
export {
  ApiError,
  AuthenticationError,
  ValidationError,
  NetworkError,
  RateLimitError,
  ServerError
};

// Export default client
export default PluggedInClient;
