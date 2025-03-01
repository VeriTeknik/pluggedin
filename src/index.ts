/**
 * Main entry point for the plugged-in-api client
 * @module plugged-in-api
 */

import { PluggedInClient } from './client';
import { 
  PluggedInOptions,
  RequestConfig,
  RequestParams,
  ResponseData,
  PluggridConfig,
  RawQueryOptions,
  ErrorResponseData
} from './types';

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

// Export types
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
