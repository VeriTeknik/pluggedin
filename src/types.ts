/**
 * Type definitions for the query client
 */

export interface PluggedInOptions {
  /** API URL (defaults to https://api.plugged.in) */
  apiUrl?: string;
  /** API token for authentication */
  apiToken?: string;
  /** Request timeout in milliseconds (defaults to 30000) */
  timeout?: number;
}

export interface RequestConfig {
  /** HTTP method (defaults to GET) */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** API endpoint */
  endpoint: string;
  /** Request parameters */
  params?: RequestParams;
  /** Request body data */
  data?: any;
  /** Additional headers */
  headers?: Record<string, string>;
}

export interface RequestParams {
  /** Query string */
  query?: string;
  /** Pluggrid configuration */
  pluggrid?: PluggridConfig;
  /** Additional parameters */
  [key: string]: any;
}

export interface PluggridConfig {
  /** Pluggrid identifier */
  id?: string;
  /** Pluggrid version */
  version?: string;
  /** Pluggrid configuration */
  config?: Record<string, any>;
  /** Pluggrid parameters */
  [key: string]: any;
}

export interface RawQueryOptions {
  /** AI model to use for the query */
  model: string;
  /** Custom instructions for the AI */
  customInstructions?: string;
  /** Input encoding format */
  inputEncoding?: 'json' | 'text' | 'markdown';
  /** Output encoding format */
  outputEncoding?: 'json' | 'text' | 'markdown';
  /** Additional parameters for the query */
  [key: string]: any;
}

export interface ResponseData<T = any> {
  /** Response status */
  status?: 'success' | 'error';
  /** Response data */
  data?: T;
  /** Error message if status is error */
  message?: string;
  /** Error details if status is error */
  error?: any;
  /** Additional metadata */
  meta?: Record<string, any>;
}

export interface ErrorResponseData {
  /** Error message */
  message?: string;
  /** Error code */
  code?: string | number;
  /** Error details */
  details?: any;
  /** Original error */
  original?: any;
}
