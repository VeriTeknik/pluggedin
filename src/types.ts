/**
 * Type definitions for the query client
 */

/**
 * Input encoding types supported by the API
 */
export type InputEncoding = 'text' | 'json' | 'image' | 'audio' | 'video' | 'binary';

/**
 * Output encoding types supported by the API
 */
export type OutputEncoding = 'text' | 'json' | 'audio' | 'image' | 'markdown' | 'html' | 'xml';

/**
 * Configuration options for automatic retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Initial delay before the first retry (in ms) */
  initialDelay?: number;
  /** Factor by which to increase delay between retries */
  backoffFactor?: number;
  /** Maximum delay between retries (in ms) */
  maxDelay?: number;
  /** HTTP status codes that should trigger a retry */
  retryStatusCodes?: number[];
  /** Boolean function to determine if a specific error should be retried */
  retryCondition?: (error: Error) => boolean;
}

/**
 * Options for initializing the PluggedIn client
 */
export interface PluggedInOptions {
  /** API URL (defaults to https://api.plugged.in) */
  apiUrl?: string;
  /** API token for authentication */
  apiToken?: string;
  /** Request timeout in milliseconds (defaults to 30000) */
  timeout?: number;
  /** Default AI model to use for queries */
  defaultModel?: string;
  /** Default input encoding format */
  defaultInputEncoding?: InputEncoding;
  /** Default output encoding format */
  defaultOutputEncoding?: OutputEncoding;
  /** Configuration for automatic retry behavior */
  retryConfig?: RetryConfig;
}

/**
 * Configuration for making HTTP requests to the API
 */
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

/**
 * Parameters for API requests
 */
export interface RequestParams {
  /** Query string */
  query?: string;
  /** Pluggrid configuration */
  pluggrid?: PluggridConfig;
  /** Additional parameters */
  [key: string]: any;
}

/**
 * Configuration for a pluggrid
 */
export interface PluggridConfig {
  /** Pluggrid identifier */
  id: string;
  /** Pluggrid version */
  version?: string;
  /** Pluggrid configuration */
  config?: Record<string, any>;
  /** Pluggrid parameters */
  [key: string]: any;
}

/**
 * Format options for specific output encodings
 */
export interface FormatOptions {
  /** Options specific to JSON encoding */
  json?: JsonFormatOptions;
  /** Options specific to Markdown encoding */
  markdown?: MarkdownFormatOptions;
  /** Options specific to HTML encoding */
  html?: HtmlFormatOptions;
}

/**
 * Options for JSON formatting
 */
export interface JsonFormatOptions {
  /** Indentation level for pretty-printing */
  indent?: number;
  /** Schema for JSON validation */
  schema?: any;
}

/**
 * Options for Markdown formatting
 */
export interface MarkdownFormatOptions {
  /** Generate table of contents */
  toc?: boolean;
  /** Header level to start with */
  headerLevel?: number;
}

/**
 * Options for HTML formatting 
 */
export interface HtmlFormatOptions {
  /** Include document head/body tags */
  fullDocument?: boolean;
  /** CSS class to apply to root element */
  className?: string;
}

/**
 * Options for controlling encoding behavior
 */
export interface EncodingOptions {
  /** Input data format */
  inputEncoding?: InputEncoding;
  /** Output data format */
  outputEncoding?: OutputEncoding;
  /** Additional format-specific options */
  formatOptions?: FormatOptions;
}

/**
 * Parameters for making a query
 */
export interface QueryParams extends EncodingOptions {
  /** AI model to use */
  model?: string;
  /** Temperature for sampling (0.0-1.0) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Whether to stream the response */
  stream?: boolean;
  /** Files or data to attach to the query */
  attachments?: Attachment[];
  /** Additional context for RAG or conversation history */
  context?: ContextInfo;
  /** Arbitrary metadata to include with the request */
  metadata?: Record<string, any>;
}

/**
 * Options for making a raw model query
 */
export interface RawQueryOptions extends QueryParams {
  /** AI model to use (required) */
  model: string;
  /** Custom instructions for the AI */
  customInstructions?: string;
}

/**
 * Attachment for multi-part requests
 */
export interface Attachment {
  /** Type of the attachment */
  type: InputEncoding;
  /** Attachment data */
  data: string | Buffer | ArrayBuffer;
  /** Optional filename */
  filename?: string;
  /** MIME type of the attachment */
  mimeType?: string;
}

/**
 * Additional context information for RAG and conversation history
 */
export interface ContextInfo {
  /** Documents for Retrieval Augmented Generation */
  documents?: Document[];
  /** Conversation identifier for maintaining state */
  conversationId?: string;
  /** Previous messages in a conversation */
  previousMessages?: Message[];
}

/**
 * Document for RAG (Retrieval Augmented Generation)
 */
export interface Document {
  /** Document content */
  content: string;
  /** Document identifier */
  id?: string;
  /** Document metadata */
  metadata?: Record<string, any>;
}

/**
 * Message in a conversation history
 */
export interface Message {
  /** Message role (e.g., 'user', 'assistant') */
  role: 'user' | 'assistant' | 'system';
  /** Message content */
  content: string;
  /** Message timestamp */
  timestamp?: string;
  /** Message identifier */
  id?: string;
}

/**
 * Response from a query
 */
export interface QueryResponse<T = any> {
  /** Query identifier */
  id: string;
  /** Query result data */
  result: T;
  /** AI model used */
  model: string;
  /** Token usage information */
  usage: {
    /** Number of tokens in the prompt */
    promptTokens: number;
    /** Number of tokens in the completion */
    completionTokens: number;
    /** Total tokens used */
    totalTokens: number;
    /** Estimated cost (if available) */
    cost?: number;
  };
  /** Input encoding used */
  inputEncoding: InputEncoding;
  /** Output encoding used */
  outputEncoding: OutputEncoding;
  /** Additional metadata from the API */
  metadata?: Record<string, any>;
  /** Timestamp when the response was created */
  createdAt: string;
}

/**
 * Generic API response data
 */
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
  /** HTTP status code (for internal use) */
  statusCode?: number;
  /** Response headers (for internal use) */
  headers?: Record<string, string>;
}

/**
 * Error response data structure
 */
export interface ErrorResponseData {
  /** Error message */
  message?: string;
  /** Error code */
  code?: string | number;
  /** Error details */
  details?: any;
  /** Original error */
  original?: any;
  /** Retry information, if available */
  retry?: {
    /** Retry-After value from headers */
    after?: number;
    /** Maximum number of retry attempts */
    maxAttempts?: number;
    /** Current retry attempt */
    attempt?: number;
  };
}
