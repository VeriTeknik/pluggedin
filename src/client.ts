/**
 * Client implementation for accessing api.plugged.in
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { 
  PluggedInOptions, 
  RequestConfig, 
  RequestParams, 
  ResponseData,
  PluggridConfig,
  RawQueryOptions,
  QueryResponse,
  InputEncoding,
  OutputEncoding,
  RetryConfig,
  QueryParams
} from './types';
import { 
  ApiError, 
  AuthenticationError,
  RateLimitError,
  ServerError, 
  NetworkError,
  ValidationError 
} from './errors';
import { 
  buildUrl, 
  validateParams
} from './utils';

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffFactor: 2,
  maxDelay: 30000,
  retryStatusCodes: [408, 429, 500, 502, 503, 504]
};

/**
 * Check if a value is a Buffer
 * @param value The value to check
 * @returns Boolean indicating if value is a Buffer
 */
function isBuffer(value: any): boolean {
  return Buffer.isBuffer(value);
}

/**
 * Check if a value is an ArrayBuffer
 * @param value The value to check
 * @returns Boolean indicating if value is an ArrayBuffer
 */
function isArrayBuffer(value: any): boolean {
  return value instanceof ArrayBuffer;
}

/**
 * Encodes binary data for API transmission
 * @param data The binary data (Buffer or ArrayBuffer)
 * @param encoding The input encoding type
 * @param mimeType Optional MIME type for the data
 * @returns Encoded string representation
 */
function encodeInput(
  data: Buffer | ArrayBuffer,
  encoding: InputEncoding,
  mimeType?: string
): string {
  // Convert ArrayBuffer to Buffer if needed
  const buffer = data instanceof ArrayBuffer ? Buffer.from(data) : data;
  
  // Default MIME types based on encoding
  const defaultMimeTypes: Record<string, string> = {
    'image': 'image/jpeg',
    'audio': 'audio/mpeg',
    'video': 'video/mp4',
    'binary': 'application/octet-stream'
  };
  
  // Use provided MIME type or default based on encoding
  const actualMimeType = mimeType || defaultMimeTypes[encoding] || 'application/octet-stream';
  
  // Create data URI
  return `data:${actualMimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Gets the content type for a given input encoding
 * @param encoding The input encoding
 * @param mimeType Optional specific MIME type
 * @returns The content type string
 */
function getContentType(encoding: InputEncoding, mimeType?: string): string {
  const mimeMap: Record<InputEncoding, string> = {
    'text': 'text/plain',
    'json': 'application/json',
    'image': 'image/jpeg',
    'audio': 'audio/mpeg',
    'video': 'video/mp4',
    'binary': 'application/octet-stream'
  };
  
  return mimeType || mimeMap[encoding];
}

/**
 * Get file extension from MIME type
 * @param mimeType The MIME type
 * @returns File extension (without dot)
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'text/plain': 'txt',
    'application/json': 'json',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'video/mp4': 'mp4',
    'video/mpeg': 'mpeg',
    'application/octet-stream': 'bin',
    'text/markdown': 'md',
    'text/html': 'html',
    'application/xml': 'xml'
  };
  
  return mimeToExt[mimeType] || 'bin';
}

/**
 * Creates a FormData object for multipart requests
 * @param data The binary data
 * @param encoding The input encoding type
 * @param params Query parameters including metadata
 * @returns FormData object
 */
function createFormData(
  data: Buffer | ArrayBuffer,
  encoding: InputEncoding,
  params: QueryParams
): FormData {
  const formData = new FormData();
  
  // Convert ArrayBuffer to Buffer if needed
  const buffer = data instanceof ArrayBuffer ? Buffer.from(data) : data;
  
  // Determine filename and MIME type
  const mimeType = params.metadata?.mimeType || getContentType(encoding);
  const filename = params.metadata?.filename || `file.${getExtensionFromMimeType(mimeType)}`;
  
  // Create a Blob with the correct type
  const blob = new Blob([buffer], { type: mimeType });
  
  // Add the main file
  formData.append('file', blob, filename);
  
  // Add any attachments
  if (params.attachments) {
    params.attachments.forEach((attachment, index) => {
      const attachmentData = attachment.data;
      const attachmentMimeType = attachment.mimeType || getContentType(attachment.type);
      const attachmentFilename = attachment.filename || `attachment-${index}.${getExtensionFromMimeType(attachmentMimeType)}`;
      
      let attachmentBlob: Blob;
      
      if (typeof attachmentData === 'string') {
        attachmentBlob = new Blob([attachmentData], { type: attachmentMimeType });
      } else if (isBuffer(attachmentData) || isArrayBuffer(attachmentData)) {
        const buffer = isArrayBuffer(attachmentData) ? Buffer.from(attachmentData as ArrayBuffer) : attachmentData;
        attachmentBlob = new Blob([buffer], { type: attachmentMimeType });
      } else {
        throw new ValidationError(`Invalid attachment data format for attachment ${index}`);
      }
      
      formData.append(`attachment-${index}`, attachmentBlob, attachmentFilename);
    });
  }
  
  return formData;
}

/**
 * Processes the output according to the specified encoding
 * @param data The response data
 * @param encoding The output encoding
 * @param formatOptions Optional format-specific options
 * @returns Processed output in the requested format
 */
function processOutputEncoding(
  data: any,
  encoding: OutputEncoding,
  formatOptions?: any
): any {
  switch (encoding) {
    case 'json':
      // If data is already an object, return it
      if (typeof data === 'object' && data !== null) {
        return data;
      }
      
      // If data is a string, try to parse it as JSON
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch (e) {
          throw new ValidationError('Failed to parse response as JSON');
        }
      }
      
      return data;
      
    case 'text':
    case 'markdown':
    case 'html':
    case 'xml':
    case 'audio':
    case 'image':
    default:
      // For all other formats, return as is
      return data;
  }
}

export class PluggedInClient {
  private apiUrl: string;
  private apiToken: string | null;
  private axiosInstance: AxiosInstance;
  private defaultModel: string | null;
  private defaultInputEncoding: InputEncoding;
  private defaultOutputEncoding: OutputEncoding;
  private retryConfig: RetryConfig;
  private tokenRefreshPromise: Promise<string> | null = null;

  /**
   * Creates a new PluggedInClient
   * @param options Configuration options for the client
   */
  constructor(options: PluggedInOptions = {}) {
    this.apiUrl = options.apiUrl || 'https://api.plugged.in';
    this.apiToken = options.apiToken || null;
    this.defaultModel = options.defaultModel || null;
    this.defaultInputEncoding = options.defaultInputEncoding || 'text';
    this.defaultOutputEncoding = options.defaultOutputEncoding || 'text';
    this.retryConfig = options.retryConfig ? 
      { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig } : 
      DEFAULT_RETRY_CONFIG;

    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(this.apiToken ? { 'Authorization': `Bearer ${this.apiToken}` } : {})
      },
      timeout: options.timeout || 30000,
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      this.handleRequestError.bind(this)
    );
  }

  /**
   * Set the API token for authentication
   * @param token The API token
   */
  public setToken(token: string): void {
    this.apiToken = token;
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear the current API token
   */
  public clearToken(): void {
    this.apiToken = null;
    delete this.axiosInstance.defaults.headers.common['Authorization'];
  }

  /**
   * Make a request to the API
   * @param config Request configuration
   * @returns Promise with the response data
   */
  public async request<T = any>(config: RequestConfig): Promise<ResponseData<T>> {
    if (!this.apiToken) {
      throw new AuthenticationError('API token not set. Please set a token before making requests.');
    }

    // Validate request parameters first
    if (config.params) {
      validateParams(config.params);
    }

    try {
      const axiosConfig: AxiosRequestConfig = {
        method: config.method || 'GET',
        url: buildUrl(config.endpoint, config.params),
        data: config.data,
        headers: config.headers
      };

      const response = await this.axiosInstance.request<ResponseData<T>>(axiosConfig);
      
      // Add status code and headers to the response data for reference
      return {
        ...response.data,
        statusCode: response.status,
        headers: response.headers as Record<string, string>
      };
    } catch (error) {
      // This will be handled by the interceptor
      throw error;
    }
  }

  /**
   * Perform a query with the specified parameters
   * @param prompt The user prompt (text or binary data)
   * @param pluggrId The pluggrid identifier or configuration
   * @param customInstructions Optional custom instructions to override default pluggrid settings
   * @param params Additional query parameters
   * @returns Promise with the query results
   */
  public async query<T = any>(
    prompt: string | Buffer | ArrayBuffer,
    pluggrId?: string | PluggridConfig,
    customInstructions?: string,
    params?: QueryParams
  ): Promise<QueryResponse<T>> {
    // Validate input
    if (!prompt) {
      throw new ValidationError('Prompt is required');
    }

    // Merge parameters with defaults
    const queryParams: QueryParams = {
      inputEncoding: this.defaultInputEncoding,
      outputEncoding: this.defaultOutputEncoding,
      ...(this.defaultModel ? { model: this.defaultModel } : {}),
      ...params
    };

    // Handle different input types
    const inputEncoding = queryParams.inputEncoding || this.defaultInputEncoding;
    let processedPrompt: string | FormData;
    let headers: Record<string, string> = {};

    // Handle binary data vs string prompt
    if (typeof prompt !== 'string') {
      if (!isBuffer(prompt) && !isArrayBuffer(prompt)) {
        throw new ValidationError('Prompt must be a string, Buffer, or ArrayBuffer');
      }
      
      // Process binary data
      if (inputEncoding === 'image' || inputEncoding === 'audio' || inputEncoding === 'video' || inputEncoding === 'binary') {
        // For attachments, create FormData
        if (queryParams.attachments || queryParams.metadata?.mimeType) {
          const formData = createFormData(prompt, inputEncoding, queryParams);
          processedPrompt = formData;
          // Let axios set the content-type with boundary for multipart/form-data
          headers = {}; 
        } else {
          // Encode binary data
          processedPrompt = encodeInput(prompt, inputEncoding, queryParams.metadata?.mimeType);
        }
      } else {
        throw new ValidationError(`Cannot use binary data with inputEncoding: ${inputEncoding}`);
      }
    } else {
      // Handle text-based prompt
      processedPrompt = prompt;
    }

    // Prepare request parameters
    const requestParams: RequestParams = {
      ...queryParams
    };

    // Handle pluggrId which can be either a string ID or a full PluggridConfig
    if (pluggrId) {
      if (typeof pluggrId === 'string') {
        requestParams.pluggrid = { id: pluggrId };
      } else {
        requestParams.pluggrid = pluggrId;
      }
    }

    // Add custom instructions if provided
    if (customInstructions) {
      if (!requestParams.pluggrid) {
        requestParams.pluggrid = { id: '' };
      }
      requestParams.pluggrid.customInstructions = customInstructions;
    }

    // Determine the right endpoint and data structure
    let endpoint = '/query';
    let data: any;

    if (processedPrompt instanceof FormData) {
      // For multipart/form-data requests
      data = processedPrompt;
      // Add params to the form data
      for (const [key, value] of Object.entries(requestParams)) {
        if (key !== 'attachments' && key !== 'metadata') {
          if (typeof value === 'object') {
            data.append(key, JSON.stringify(value));
          } else {
            data.append(key, String(value));
          }
        }
      }
    } else {
      // For JSON requests
      data = {
        query: processedPrompt,
        ...requestParams
      };
    }

    // Make the request
    const response = await this.request<QueryResponse<any>>({
      method: 'POST',
      endpoint,
      data,
      headers
    });

    // Process the response based on the outputEncoding
    if (response.data) {
      const result = response.data;
      const outputEncoding = queryParams.outputEncoding || this.defaultOutputEncoding;
      
      // Process the output according to the specified encoding
      if (result.result) {
        result.result = processOutputEncoding(result.result, outputEncoding, queryParams.formatOptions);
      }
      
      return result as QueryResponse<T>;
    }
    
    throw new ApiError('Invalid response received from the server', 0, {
      message: 'Response data is missing or malformed'
    });
  }

  /**
   * Perform a direct AI query without using pluggrids
   * @param prompt The user prompt (text or binary data)
   * @param options Configuration options for the raw query
   * @returns Promise with the query results
   */
  public async rawQuery<T = any>(
    prompt: string | Buffer | ArrayBuffer,
    options: RawQueryOptions
  ): Promise<QueryResponse<T>> {
    // Validate input
    if (!prompt) {
      throw new ValidationError('Prompt is required');
    }

    if (!options.model) {
      throw new ValidationError('Model is required for raw queries');
    }

    // Set default encodings if not provided
    const inputEncoding = options.inputEncoding || this.defaultInputEncoding;
    const outputEncoding = options.outputEncoding || this.defaultOutputEncoding;

    // Handle different input types
    let processedPrompt: string | FormData;
    let headers: Record<string, string> = {};

    // Handle binary data vs string prompt
    if (typeof prompt !== 'string') {
      if (!isBuffer(prompt) && !isArrayBuffer(prompt)) {
        throw new ValidationError('Prompt must be a string, Buffer, or ArrayBuffer');
      }
      
      // Process binary data
      if (inputEncoding === 'image' || inputEncoding === 'audio' || inputEncoding === 'video' || inputEncoding === 'binary') {
        // For attachments, create FormData
        if (options.attachments || options.metadata?.mimeType) {
          const formData = createFormData(prompt, inputEncoding, options);
          processedPrompt = formData;
          // Let axios set the content-type with boundary for multipart/form-data
          headers = {}; 
        } else {
          // Encode binary data
          processedPrompt = encodeInput(prompt, inputEncoding, options.metadata?.mimeType);
        }
      } else {
        throw new ValidationError(`Cannot use binary data with inputEncoding: ${inputEncoding}`);
      }
    } else {
      // Text-based prompt
      processedPrompt = prompt;
    }

    // Create request data
    let data: any;
    
    if (processedPrompt instanceof FormData) {
      // For multipart/form-data requests
      data = processedPrompt;
      // Add options to the form data
      data.append('model', options.model);
      
      if (options.customInstructions) {
        data.append('customInstructions', options.customInstructions);
      }
      
      data.append('inputEncoding', inputEncoding);
      data.append('outputEncoding', outputEncoding);
      
      // Add remaining options (excluding already processed ones)
      for (const [key, value] of Object.entries(options)) {
        if (key !== 'model' && key !== 'customInstructions' && 
            key !== 'inputEncoding' && key !== 'outputEncoding' &&
            key !== 'attachments' && key !== 'metadata') {
          if (typeof value === 'object') {
            data.append(key, JSON.stringify(value));
          } else {
            data.append(key, String(value));
          }
        }
      }
    } else {
      // For JSON requests
      data = {
        prompt: processedPrompt,
        model: options.model,
        customInstructions: options.customInstructions,
        inputEncoding,
        outputEncoding
      };
      
      // Add remaining options (excluding already processed ones)
      for (const [key, value] of Object.entries(options)) {
        if (key !== 'model' && key !== 'customInstructions' && 
            key !== 'inputEncoding' && key !== 'outputEncoding' &&
            key !== 'attachments' && key !== 'metadata') {
          data[key] = value;
        }
      }
    }

    // Make the request
    const response = await this.request<QueryResponse<any>>({
      method: 'POST',
      endpoint: '/ai/query',
      data,
      headers
    });

    // Process the response
    if (response.data) {
      const result = response.data;
      
      // Process the output according to the specified encoding
      if (result.result) {
        result.result = processOutputEncoding(result.result, outputEncoding, options.formatOptions);
      }
      
      return result as QueryResponse<T>;
    }
    
    throw new ApiError('Invalid response received from the server', 0, {
      message: 'Response data is missing or malformed'
    });
  }

  /**
   * Handle request errors and transform them into appropriate error types
   * @param error The original error from axios
   * @param retryAttempt Current retry attempt number
   */
  private async handleRequestError(error: AxiosError, retryAttempt: number = 0): Promise<never> {
    // Check if we should retry the request
    const shouldRetry = this.shouldRetryRequest(error, retryAttempt);
    
    if (shouldRetry) {
      // Calculate delay with exponential backoff
      const delay = Math.min(
        this.retryConfig.initialDelay! * Math.pow(this.retryConfig.backoffFactor!, retryAttempt),
        this.retryConfig.maxDelay!
      );
      
      // Get retry-after header value if present
      let retryAfter = 0;
      if (error.response?.headers['retry-after']) {
        retryAfter = parseInt(error.response.headers['retry-after'] as string, 10) * 1000;
      }
      
      // Use the larger of calculated delay or retry-after header
      const waitTime = Math.max(delay, retryAfter);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Retry the request
      try {
        // We need to reconstruct the original request config
        const originalRequest = error.config!;
        const response = await this.axiosInstance.request(originalRequest);
        return response as never;
      } catch (retryError) {
        // If retry fails, handle the new error with incremented retry count
        return this.handleRequestError(retryError as AxiosError, retryAttempt + 1);
      }
    }
    
    // If we shouldn't retry or reached max retries, handle the error normally
    if (error.response) {
      // Server responded with an error status code
      const status = error.response.status;
      const data = error.response.data as any;
      
      // Add retry information to the error data
      const errorData = {
        ...data,
        retry: {
          attempt: retryAttempt,
          maxAttempts: this.retryConfig.maxRetries
        }
      };
      
      if (status === 401) {
        throw new AuthenticationError(
          data.message || 'Authentication failed. Please check your API token.',
          status,
          errorData
        );
      } else if (status === 400) {
        throw new ValidationError(
          data.message || 'Invalid request parameters',
          status,
          errorData
        );
      } else if (status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        errorData.retry.after = retryAfter ? parseInt(retryAfter as string, 10) : undefined;
        
        throw new RateLimitError(
          data.message || 'Rate limit exceeded. Please try again later.',
          status,
          errorData
        );
      } else if (status >= 500) {
        throw new ServerError(
          data.message || 'Server error occurred. Please try again later.',
          status,
          errorData
        );
      } else {
        throw new ApiError(
          data.message || `API error with status code: ${status}`,
          status,
          errorData
        );
      }
    } else if (error.request) {
      // Request was made but no response was received
      throw new NetworkError(
        'No response received from the server. Please check your network connection.',
        0,
        { 
          original: error,
          retry: {
            attempt: retryAttempt,
            maxAttempts: this.retryConfig.maxRetries
          }
        }
      );
    } else {
      // Something happened in setting up the request
      throw new ApiError(
        error.message || 'An error occurred while setting up the request',
        0,
        { 
          original: error,
          retry: {
            attempt: retryAttempt,
            maxAttempts: this.retryConfig.maxRetries
          }
        }
      );
    }
  }
  
  /**
   * Determine whether a request should be retried
   * @param error The error from the failed request
   * @param retryAttempt Current retry attempt number
   * @returns Whether the request should be retried
   */
  private shouldRetryRequest(error: AxiosError, retryAttempt: number): boolean {
    // Don't retry if we've reached the maximum number of retries
    if (retryAttempt >= this.retryConfig.maxRetries!) {
      return false;
    }
    
    // Check if it's a network error (no response)
    if (!error.response) {
      return true;
    }
    
    // Check if the status code is in the retryable status codes list
    if (error.response.status && this.retryConfig.retryStatusCodes!.includes(error.response.status)) {
      return true;
    }
    
    // Check custom retry condition if provided
    if (this.retryConfig.retryCondition && this.retryConfig.retryCondition(error)) {
      return true;
    }
    
    return false;
  }
}
