import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { PluggedInClient } from '../src/client';
import { 
  ApiError, 
  AuthenticationError, 
  ValidationError, 
  NetworkError,
  RateLimitError,
  ServerError
} from '../src/errors';

// Mock axios
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('PluggedInClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios.create
    const mockRequest = jest.fn();
    mockRequest.mockResolvedValue({});
    
    mockAxios.create.mockReturnValue({
      defaults: {
        headers: {
          common: {}
        }
      },
      request: mockRequest,
      interceptors: {
        response: {
          use: jest.fn((successFn, errorFn) => {
            // Store the error handler for testing
            (mockAxios as any).errorHandler = errorFn;
            return () => {};
          })
        }
      }
    } as any);
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const client = new PluggedInClient({});
      expect(mockAxios.create).toHaveBeenCalledWith(expect.objectContaining({
        baseURL: 'https://api.plugged.in',
        timeout: 30000
      }));
    });

    it('should initialize with custom options', () => {
      const client = new PluggedInClient({
        apiUrl: 'https://custom-api.plugged.in',
        apiToken: 'test-token',
        timeout: 5000
      });
      
      expect(mockAxios.create).toHaveBeenCalledWith(expect.objectContaining({
        baseURL: 'https://custom-api.plugged.in',
        timeout: 5000,
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token'
        })
      }));
    });
    
    it('should set up response interceptors correctly', () => {
      // Create a mock for the response interceptor
      const useResponseInterceptor = jest.fn((successFn, errorFn) => {
        // Store the interceptor functions for testing
        (mockAxios as any).successInterceptor = successFn;
        (mockAxios as any).errorInterceptor = errorFn;
        return () => {};
      });
      
      // Set up the mock axios instance with our test interceptor
      mockAxios.create.mockReturnValueOnce({
        defaults: { headers: { common: {} } },
        request: jest.fn(),
        interceptors: {
          response: { use: useResponseInterceptor }
        }
      } as any);
      
      // Initialize the client
      const client = new PluggedInClient({});
      
      // Verify the interceptor was set up
      expect(useResponseInterceptor).toHaveBeenCalledTimes(1);
      
      // Test the success interceptor
      const mockResponse = { data: { result: 'success' } };
      const result = (mockAxios as any).successInterceptor(mockResponse);
      expect(result).toBe(mockResponse);
    });
  });

  describe('setToken', () => {
    it('should update the token in headers', () => {
      const client = new PluggedInClient({});
      const axiosInstance = mockAxios.create();
      
      client.setToken('new-token');
      
      expect(axiosInstance.defaults.headers.common['Authorization']).toBe('Bearer new-token');
    });
  });

  describe('clearToken', () => {
    it('should remove the token from headers', () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      axiosInstance.defaults.headers.common['Authorization'] = 'Bearer test-token';
      
      client.clearToken();
      
      expect(axiosInstance.defaults.headers.common['Authorization']).toBeUndefined();
    });
  });

  describe('request', () => {
    it('should throw if no token is set', async () => {
      const client = new PluggedInClient({});
      
      await expect(client.request({
        endpoint: '/test'
      })).rejects.toThrow(AuthenticationError);
    });

    it('should make a request with the correct configuration', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { status: 'success', data: { result: 'test' } }
      });
      
      const response = await client.request({
        method: 'POST',
        endpoint: '/test',
        data: { key: 'value' }
      });
      
      expect(axiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/test',
        data: { key: 'value' }
      }));
      
      expect(response).toEqual({ status: 'success', data: { result: 'test' } });
    });
    
    it('should validate request parameters if provided', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      
      await expect(client.request({
        endpoint: '/test',
        params: { query: '' } // Empty query should throw validation error
      })).rejects.toThrow(ValidationError);
    });
  });

  describe('query', () => {
    it('should throw if prompt is not provided', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      
      await expect(client.query('')).rejects.toThrow(ValidationError);
      await expect(client.query(null as any)).rejects.toThrow(ValidationError);
    });

    it('should make a query request with just a prompt', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { status: 'success', data: { results: [] } }
      });
      
      await client.query('test prompt');
      
      expect(axiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/query',
        data: {
          query: 'test prompt'
        }
      }));
    });

    it('should make a query request with a pluggrid ID string', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { status: 'success', data: { results: [] } }
      });
      
      await client.query('test prompt', 'grid1');
      
      expect(axiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/query',
        data: {
          query: 'test prompt',
          pluggrid: { id: 'grid1' }
        }
      }));
    });
    
    it('should make a query request with a pluggrid config object', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { status: 'success', data: { results: [] } }
      });
      
      await client.query('test prompt', { id: 'grid1', version: '1.0' });
      
      expect(axiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/query',
        data: {
          query: 'test prompt',
          pluggrid: { id: 'grid1', version: '1.0' }
        }
      }));
    });

    it('should make a query request with custom instructions', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { status: 'success', data: { results: [] } }
      });
      
      await client.query('test prompt', 'grid1', 'Custom instructions');
      
      expect(axiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/query',
        data: {
          query: 'test prompt',
          pluggrid: { 
            id: 'grid1',
            customInstructions: 'Custom instructions'
          }
        }
      }));
    });
    
    it('should make a query request with additional parameters', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { status: 'success', data: { results: [] } }
      });
      
      const additionalParams = { maxResults: 5, format: 'json' };
      await client.query('test prompt', 'grid1', undefined, additionalParams);
      
      expect(axiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/query',
        data: {
          query: 'test prompt',
          pluggrid: { id: 'grid1' },
          maxResults: 5,
          format: 'json'
        }
      }));
    });
  });

  describe('rawQuery', () => {
    it('should throw if prompt is not provided', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      
      await expect(client.rawQuery('', { model: 'gpt-4' })).rejects.toThrow(ValidationError);
      await expect(client.rawQuery(null as any, { model: 'gpt-4' })).rejects.toThrow(ValidationError);
    });

    it('should throw if model is not provided', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      
      await expect(client.rawQuery('test prompt', {} as any)).rejects.toThrow(ValidationError);
    });

    it('should make a raw query request with minimal parameters', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { status: 'success', data: { results: [] } }
      });
      
      await client.rawQuery('test prompt', { model: 'gpt-4' });
      
      expect(axiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/ai/query',
        data: {
          prompt: 'test prompt',
          model: 'gpt-4',
          inputEncoding: 'text',
          outputEncoding: 'text'
        }
      }));
    });

    it('should make a raw query request with all parameters', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { status: 'success', data: { results: [] } }
      });
      
      await client.rawQuery('test prompt', {
        model: 'gpt-4',
        customInstructions: 'Be concise',
        inputEncoding: 'markdown',
        outputEncoding: 'json',
        temperature: 0.7,
        maxTokens: 1000
      });
      
      expect(axiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/ai/query',
        data: {
          prompt: 'test prompt',
          model: 'gpt-4',
          customInstructions: 'Be concise',
          inputEncoding: 'markdown',
          outputEncoding: 'json',
          temperature: 0.7,
          maxTokens: 1000
        }
      }));
    });
  });

  describe('error handling', () => {
    it('should handle authentication errors', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const errorHandler = (mockAxios as any).errorHandler;
      
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Invalid token' }
        }
      };
      
      await expect(errorHandler(mockError)).rejects.toThrow(AuthenticationError);
    });

    it('should handle validation errors', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const errorHandler = (mockAxios as any).errorHandler;
      
      const mockError = {
        response: {
          status: 400,
          data: { message: 'Invalid parameters' }
        }
      };
      
      await expect(errorHandler(mockError)).rejects.toThrow(ValidationError);
    });

    it('should handle network errors', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const errorHandler = (mockAxios as any).errorHandler;
      
      const mockError = {
        request: {},
        message: 'Network Error'
      };
      
      await expect(errorHandler(mockError)).rejects.toThrow(NetworkError);
    });

    it('should handle general API errors', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const errorHandler = (mockAxios as any).errorHandler;
      
      const mockError = {
        response: {
          status: 500,
          data: { message: 'Server error' }
        }
      };
      
      await expect(errorHandler(mockError)).rejects.toThrow(ApiError);
    });
    
    it('should handle rate limit errors', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const errorHandler = (mockAxios as any).errorHandler;
      
      const mockError = {
        response: {
          status: 429,
          data: { message: 'Too many requests' }
        }
      };
      
      await expect(errorHandler(mockError)).rejects.toThrow(RateLimitError);
    });
    
    it('should handle server errors', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const errorHandler = (mockAxios as any).errorHandler;
      
      const mockError = {
        response: {
          status: 503,
          data: { message: 'Service unavailable' }
        }
      };
      
      await expect(errorHandler(mockError)).rejects.toThrow(ServerError);
    });

    it('should handle non-standard API errors with fallback to ApiError', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const errorHandler = (mockAxios as any).errorHandler;
      
      // Testing line 169 - default ApiError case
      const mockError = {
        response: {
          status: 418, // I'm a teapot - non-standard HTTP status
          data: { message: 'I refuse to brew coffee' }
        }
      };
      
      await expect(errorHandler(mockError)).rejects.toThrow(ApiError);
      await expect(errorHandler(mockError)).rejects.toThrow('I refuse to brew coffee');
    });

    it('should handle request setup errors', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const errorHandler = (mockAxios as any).errorHandler;
      
      // Testing line 184 - error during request setup
      const mockError = {
        message: 'Request configuration error'
        // No response or request property
      };
      
      await expect(errorHandler(mockError)).rejects.toThrow(ApiError);
      await expect(errorHandler(mockError)).rejects.toThrow('Request configuration error');
    });

    it('should propagate errors in request method', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      
      // Testing line 98 - error propagation in request method
      const mockError = new Error('Something went wrong');
      (axiosInstance.request as jest.Mock).mockRejectedValueOnce(mockError);
      
      await expect(client.request({
        endpoint: '/test'
      })).rejects.toThrow('Something went wrong');
    });
  });
});
