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
  RawQueryOptions
} from './types';
import { 
  ApiError, 
  AuthenticationError,
  RateLimitError,
  ServerError, 
  NetworkError,
  ValidationError 
} from './errors';
import { buildUrl, validateParams } from './utils';

export class PluggedInClient {
  private apiUrl: string;
  private apiToken: string | null;
  private axiosInstance: AxiosInstance;
  private tokenRefreshPromise: Promise<string> | null = null;

  /**
   * Creates a new PluggedInClient
   * @param options Configuration options for the client
   */
  constructor(options: PluggedInOptions) {
    this.apiUrl = options.apiUrl || 'https://api.plugged.in';
    this.apiToken = options.apiToken || null;

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
      return response.data;
    } catch (error) {
      // This will be handled by the interceptor
      throw error;
    }
  }

  /**
   * Perform a query with the specified parameters
   * @param prompt The user prompt string
   * @param pluggrId The pluggrid identifier or configuration
   * @param customInstructions Optional custom instructions to override default pluggrid settings
   * @param params Additional query parameters
   * @returns Promise with the query results
   */
  public async query<T = any>(
    prompt: string,
    pluggrId?: string | PluggridConfig,
    customInstructions?: string,
    params?: RequestParams
  ): Promise<ResponseData<T>> {
    if (!prompt || typeof prompt !== 'string') {
      throw new ValidationError('Prompt is required and must be a string');
    }

    const requestParams: RequestParams = {
      query: prompt,
      ...params
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
        requestParams.pluggrid = {};
      }
      requestParams.pluggrid.customInstructions = customInstructions;
    }

    return this.request<T>({
      method: 'POST',
      endpoint: '/query',
      data: requestParams
    });
  }

  /**
   * Perform a direct AI query without using pluggrids
   * @param prompt The user prompt string
   * @param options Configuration options for the raw query
   * @returns Promise with the query results
   */
  public async rawQuery<T = any>(
    prompt: string,
    options: RawQueryOptions
  ): Promise<ResponseData<T>> {
    if (!prompt || typeof prompt !== 'string') {
      throw new ValidationError('Prompt is required and must be a string');
    }

    if (!options.model) {
      throw new ValidationError('Model is required for raw queries');
    }

    // Extract the main fields we want to use
    const { 
      model, 
      customInstructions, 
      inputEncoding = 'text', 
      outputEncoding = 'text',
      ...restOptions 
    } = options;
    
    // Create request data with our parameters in the desired order
    const requestData = {
      prompt,
      model,
      customInstructions,
      inputEncoding,
      outputEncoding,
      ...restOptions
    };

    return this.request<T>({
      method: 'POST',
      endpoint: '/ai/query',
      data: requestData
    });
  }

  /**
   * Handle request errors and transform them into appropriate error types
   * @param error The original error from axios
   */
  private async handleRequestError(error: AxiosError): Promise<never> {
    if (error.response) {
      // Server responded with an error status code
      const status = error.response.status;
      const data = error.response.data as any;
      
      if (status === 401) {
        throw new AuthenticationError(
          data.message || 'Authentication failed. Please check your API token.',
          status,
          data
        );
      } else if (status === 400) {
        throw new ValidationError(
          data.message || 'Invalid request parameters',
          status,
          data
        );
      } else if (status === 429) {
        throw new RateLimitError(
          data.message || 'Rate limit exceeded. Please try again later.',
          status,
          data
        );
      } else if (status >= 500) {
        throw new ServerError(
          data.message || 'Server error occurred. Please try again later.',
          status,
          data
        );
      } else {
        throw new ApiError(
          data.message || `API error with status code: ${status}`,
          status,
          data
        );
      }
    } else if (error.request) {
      // Request was made but no response was received
      throw new NetworkError(
        'No response received from the server. Please check your network connection.',
        0,
        { original: error }
      );
    } else {
      // Something happened in setting up the request
      throw new ApiError(
        error.message || 'An error occurred while setting up the request',
        0,
        { original: error }
      );
    }
  }
}
