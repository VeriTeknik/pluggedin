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
import { InputEncoding, OutputEncoding, QueryParams } from '../src/types';

// Mock axios
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('PluggedInClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock FormData globally since it's needed for binary handling
    global.FormData = jest.fn().mockImplementation(() => ({
      append: jest.fn()
    })) as any;
    
    // Mock Blob globally
    global.Blob = jest.fn().mockImplementation(() => ({})) as any;
    
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
            // Use a function that rejects the promise instead of resolving it
            (mockAxios as any).errorHandler = (error: any) => {
              // If the original error handler throws, we need to reject the promise
              try {
                errorFn(error);
                return Promise.resolve({});
              } catch (err) {
                return Promise.reject(err);
              }
            };
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
      
      try {
        await client.request({
          endpoint: '/test'
        });
        // Should not reach here
        fail('Request should have thrown an error');
      } catch (err) {
        const error = err as ApiError;
        expect(error).toBeInstanceOf(AuthenticationError);
        expect(error.message).toContain('API token');
      }
    });

    it('should make a request with the correct configuration', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { status: 'success', data: { result: 'test' } },
        status: 200,
        headers: {}
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
      
      expect(response).toEqual({ 
        status: 'success', 
        data: { result: 'test' },
        statusCode: 200,
        headers: {}
      });
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
        data: { 
          data: { 
            id: 'test-id',
            result: [],
            model: 'test-model',
            usage: {
              promptTokens: 10,
              completionTokens: 20,
              totalTokens: 30
            },
            inputEncoding: 'text',
            outputEncoding: 'text',
            createdAt: new Date().toISOString()
          } 
        },
        status: 200,
        headers: {}
      });
      
      await client.query('test prompt');
      
      expect(axiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/query',
        data: expect.objectContaining({
          query: 'test prompt',
          inputEncoding: 'text',
          outputEncoding: 'text'
        })
      }));
    });

    it('should make a query request with a pluggrid ID string', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { 
          data: { 
            id: 'test-id',
            result: [],
            model: 'test-model',
            usage: {
              promptTokens: 10,
              completionTokens: 20,
              totalTokens: 30
            },
            inputEncoding: 'text',
            outputEncoding: 'text',
            createdAt: new Date().toISOString()
          } 
        },
        status: 200,
        headers: {}
      });
      
      await client.query('test prompt', 'grid1');
      
      expect(axiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/query',
        data: expect.objectContaining({
          query: 'test prompt',
          pluggrid: { id: 'grid1' }
        })
      }));
    });
    
    it('should make a query request with a pluggrid config object', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { 
          data: { 
            id: 'test-id',
            result: [],
            model: 'test-model',
            usage: {
              promptTokens: 10,
              completionTokens: 20,
              totalTokens: 30
            },
            inputEncoding: 'text',
            outputEncoding: 'text',
            createdAt: new Date().toISOString()
          } 
        },
        status: 200,
        headers: {}
      });
      
      await client.query('test prompt', { id: 'grid1', version: '1.0' });
      
      expect(axiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/query',
        data: expect.objectContaining({
          query: 'test prompt',
          pluggrid: { id: 'grid1', version: '1.0' }
        })
      }));
    });

    it('should make a query request with custom instructions', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { 
          data: { 
            id: 'test-id',
            result: [],
            model: 'test-model',
            usage: {
              promptTokens: 10,
              completionTokens: 20,
              totalTokens: 30
            },
            inputEncoding: 'text',
            outputEncoding: 'text',
            createdAt: new Date().toISOString()
          } 
        },
        status: 200,
        headers: {}
      });
      
      await client.query('test prompt', 'grid1', 'Custom instructions');
      
      expect(axiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/query',
        data: expect.objectContaining({
          query: 'test prompt',
          pluggrid: { 
            id: 'grid1',
            customInstructions: 'Custom instructions'
          }
        })
      }));
    });
    
    it('should make a query request with additional parameters', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { 
          data: { 
            id: 'test-id',
            result: [],
            model: 'test-model',
            usage: {
              promptTokens: 10,
              completionTokens: 20,
              totalTokens: 30
            },
            inputEncoding: 'text',
            outputEncoding: 'text',
            createdAt: new Date().toISOString()
          } 
        },
        status: 200,
        headers: {}
      });
      
      const additionalParams: QueryParams = { 
        maxTokens: 5, 
        outputEncoding: 'json',
        temperature: 0.7
      };
      await client.query('test prompt', 'grid1', undefined, additionalParams);
      
      expect(axiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/query',
        data: expect.objectContaining({
          query: 'test prompt',
          pluggrid: { id: 'grid1' },
          maxTokens: 5,
          outputEncoding: 'json',
          temperature: 0.7
        })
      }));
    });
    
    it('should process JSON input correctly', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { 
          data: { 
            id: 'test-id',
            result: [],
            model: 'test-model',
            usage: {
              promptTokens: 10,
              completionTokens: 20,
              totalTokens: 30
            },
            inputEncoding: 'json',
            outputEncoding: 'text',
            createdAt: new Date().toISOString()
          } 
        },
        status: 200,
        headers: {}
      });
      
      const jsonPrompt = { key: 'value', nested: { data: true } };
      // Use JSON.stringify directly since we're testing how the client processes JSON input
      await client.query(JSON.stringify(jsonPrompt), 'grid1', undefined, { inputEncoding: 'json' });
      
      expect(axiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/query',
        data: expect.objectContaining({
          query: JSON.stringify(jsonPrompt),
          inputEncoding: 'json'
        })
      }));
    });
    
    it('should handle Buffer input for binary encodings', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { 
          data: { 
            id: 'test-id',
            result: [],
            model: 'test-model',
            usage: {
              promptTokens: 10,
              completionTokens: 20,
              totalTokens: 30
            },
            inputEncoding: 'image',
            outputEncoding: 'text',
            createdAt: new Date().toISOString()
          } 
        },
        status: 200,
        headers: {}
      });
      
      // Create a mock Buffer
      const buffer = Buffer.from('test image data');
      
      // Mock FormData globally since it's needed for binary handling
      global.FormData = jest.fn().mockImplementation(() => ({
        append: jest.fn()
      })) as any;
      
      // Mock Blob globally
      global.Blob = jest.fn().mockImplementation(() => ({})) as any;
      
      await client.query(buffer, 'grid1', undefined, { 
        inputEncoding: 'image',
        metadata: { 
          mimeType: 'image/jpeg', 
          filename: 'test.jpg' 
        }
      });
      
      expect(axiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/query'
        })
      );
      
      delete (global as any).FormData;
      delete (global as any).Blob;
    });
    
    it('should handle ArrayBuffer input for binary encodings', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { 
          data: { 
            id: 'test-id',
            result: [],
            model: 'test-model',
            usage: {
              promptTokens: 10,
              completionTokens: 20,
              totalTokens: 30
            },
            inputEncoding: 'audio',
            outputEncoding: 'text',
            createdAt: new Date().toISOString()
          } 
        },
        status: 200,
        headers: {}
      });
      
      // Create a mock ArrayBuffer
      const arrayBuffer = new ArrayBuffer(10);
      
      // Mock FormData globally since it's needed for binary handling
      global.FormData = jest.fn().mockImplementation(() => ({
        append: jest.fn()
      })) as any;
      
      // Mock Blob globally
      global.Blob = jest.fn().mockImplementation(() => ({})) as any;
      
      await client.query(arrayBuffer, 'grid1', undefined, { 
        inputEncoding: 'audio',
        metadata: { 
          mimeType: 'audio/mp3', 
          filename: 'test.mp3' 
        }
      });
      
      expect(axiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/query'
        })
      );
      
      delete (global as any).FormData;
      delete (global as any).Blob;
    });
    
    it('should throw for invalid binary data type', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      
      // Try to pass number as binary data
      const invalidData = 123 as any;
      
      await expect(client.query(invalidData, 'grid1', undefined, { 
        inputEncoding: 'binary'
      })).rejects.toThrow(ValidationError);
    });
    
    it('should encode binary data without FormData when no attachments/metadata', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { 
          data: { 
            id: 'test-id',
            result: [],
            model: 'test-model',
            usage: {
              promptTokens: 10,
              completionTokens: 20,
              totalTokens: 30
            },
            inputEncoding: 'binary',
            outputEncoding: 'text',
            createdAt: new Date().toISOString()
          } 
        },
        status: 200,
        headers: {}
      });
      
      // Create a mock Buffer
      const buffer = Buffer.from('test binary data');
      
      await client.query(buffer, 'grid1', undefined, { 
        inputEncoding: 'binary'
      });
      
      // Should encode as base64 string in data
      expect(axiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/query',
          data: expect.objectContaining({
            query: expect.any(String),  // Base64 encoded string
            inputEncoding: 'binary'
          })
        })
      );
    });
    
    it('should apply default encodings when not provided', async () => {
      const client = new PluggedInClient({ 
        apiToken: 'test-token',
        defaultInputEncoding: 'json',
        defaultOutputEncoding: 'markdown'
      });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { 
          data: { 
            id: 'test-id',
            result: [],
            model: 'test-model',
            usage: {
              promptTokens: 10,
              completionTokens: 20,
              totalTokens: 30
            },
            inputEncoding: 'json',
            outputEncoding: 'markdown',
            createdAt: new Date().toISOString()
          } 
        },
        status: 200,
        headers: {}
      });
      
      const jsonPrompt = { key: 'value' };
      await client.query(JSON.stringify(jsonPrompt), 'grid1');
      
      expect(axiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inputEncoding: 'json',
            outputEncoding: 'markdown'
          })
        })
      );
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
        data: { 
          data: { 
            id: 'test-id',
            result: [],
            model: 'gpt-4',
            usage: {
              promptTokens: 10,
              completionTokens: 20,
              totalTokens: 30
            },
            inputEncoding: 'text',
            outputEncoding: 'text',
            createdAt: new Date().toISOString()
          } 
        },
        status: 200,
        headers: {}
      });
      
      await client.rawQuery('test prompt', { model: 'gpt-4' });
      
      expect(axiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/ai/query',
        data: expect.objectContaining({
          prompt: 'test prompt',
          model: 'gpt-4',
          inputEncoding: 'text',
          outputEncoding: 'text'
        })
      }));
    });

    it('should make a raw query request with all parameters', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      (axiosInstance.request as jest.Mock).mockResolvedValueOnce({
        data: { 
          data: { 
            id: 'test-id',
            result: [],
            model: 'gpt-4',
            usage: {
              promptTokens: 10,
              completionTokens: 20,
              totalTokens: 30
            },
            inputEncoding: 'text',
            outputEncoding: 'json',
            createdAt: new Date().toISOString()
          } 
        },
        status: 200,
        headers: {}
      });
      
      await client.rawQuery('test prompt', {
        model: 'gpt-4',
        customInstructions: 'Be concise',
        inputEncoding: 'text',
        outputEncoding: 'json',
        temperature: 0.7,
        maxTokens: 1000
      });
      
      expect(axiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/ai/query',
        data: expect.objectContaining({
          prompt: 'test prompt',
          model: 'gpt-4',
          customInstructions: 'Be concise',
          inputEncoding: 'text',
          outputEncoding: 'json',
          temperature: 0.7,
          maxTokens: 1000
        })
      }));
    });
  });

  describe('retry behavior', () => {
    it('should retry requests according to configuration', async () => {
      const client = new PluggedInClient({ 
        apiToken: 'test-token',
        retryConfig: {
          maxRetries: 2,
          initialDelay: 10, // Small value for test
          backoffFactor: 2,
          maxDelay: 100,
          retryStatusCodes: [429, 503]
        }
      });
      
      const axiosInstance = mockAxios.create();
      
      // First call fails with 429 status
      const firstError = {
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' },
          headers: {}
        },
        config: {},
        isAxiosError: true,
        toJSON: () => ({})
      } as any;
      
      // Second call succeeds
      const successResponse = {
        data: { 
          data: {
            result: 'Success after retry'
          }
        },
        status: 200,
        headers: {}
      };
      
      // Mock setTimeout
      jest.useFakeTimers();
      
      // Set up axios mock behavior for two calls
      (axiosInstance.request as jest.Mock)
        .mockRejectedValueOnce(firstError)
        .mockResolvedValueOnce(successResponse);
      
      // Start the request
      const requestPromise = client.request({
        endpoint: '/test'
      });
      
      // Fast-forward timers to simulate waiting for retry
      jest.runAllTimers();
      
      // Wait for the promise to resolve
      const result = await requestPromise;
      
      // Expect axios.request to have been called twice
      expect(axiosInstance.request).toHaveBeenCalledTimes(2);
      expect(result.data.result).toBe('Success after retry');
      
      // Restore real timers
      jest.useRealTimers();
    });
    
    it('should handle retry-after header', async () => {
      const client = new PluggedInClient({ 
        apiToken: 'test-token',
        retryConfig: {
          maxRetries: 1,
          initialDelay: 10,
          backoffFactor: 1,
          maxDelay: 1000,
          retryStatusCodes: [429]
        }
      });
      
      const axiosInstance = mockAxios.create();
      
      // Error with retry-after header
      const errorWithRetryAfter = {
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' },
          headers: {
            'retry-after': '1' // 1 second
          }
        },
        config: {},
        isAxiosError: true,
        toJSON: () => ({})
      } as any;
      
      // Success response for the retry
      const successResponse = {
        data: { 
          data: {
            result: 'Success after respecting retry-after'
          }
        },
        status: 200,
        headers: {}
      };
      
      // Mock setTimeout
      jest.useFakeTimers();
      
      // Set up axios mock behavior
      (axiosInstance.request as jest.Mock)
        .mockRejectedValueOnce(errorWithRetryAfter)
        .mockResolvedValueOnce(successResponse);
      
      // Start the request
      const requestPromise = client.request({
        endpoint: '/test'
      });
      
      // Fast-forward timers to simulate waiting for retry-after
      jest.runAllTimers();
      
      // Wait for the promise to resolve
      const result = await requestPromise;
      
      // Verify the result
      expect(result.data.result).toBe('Success after respecting retry-after');
      expect(axiosInstance.request).toHaveBeenCalledTimes(2);
      
      // Restore real timers
      jest.useRealTimers();
    });
    
    it('should give up after max retries', async () => {
      const client = new PluggedInClient({ 
        apiToken: 'test-token',
        retryConfig: {
          maxRetries: 2,
          initialDelay: 10,
          backoffFactor: 1,
          maxDelay: 100,
          retryStatusCodes: [500]
        }
      });
      
      const axiosInstance = mockAxios.create();
      
      // Create error that will occur on all attempts
      const serverError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' },
          headers: {}
        },
        config: {},
        isAxiosError: true,
        toJSON: () => ({})
      } as any;
      
      // Mock setTimeout
      jest.useFakeTimers();
      
      // All requests fail with 500
      (axiosInstance.request as jest.Mock)
        .mockRejectedValue(serverError);
      
      // Start the request
      const requestPromise = client.request({
        endpoint: '/test'
      });
      
      // Fast-forward timers for all retries
      jest.runAllTimers();
      jest.runAllTimers();
      
      // Should eventually fail with a ServerError
      await expect(requestPromise).rejects.toThrow(ServerError);
      
      // Should have tried 3 times (original + 2 retries)
      expect(axiosInstance.request).toHaveBeenCalledTimes(3);
      
      // Restore real timers
      jest.useRealTimers();
    });
  });

  describe('error handling', () => {
    // Direct testing of error classes without using the client error handler
    it('should create appropriate error types', () => {
      // Authentication error
      const authError = new AuthenticationError('Invalid token', 401, { message: 'Invalid token' });
      expect(authError).toBeInstanceOf(AuthenticationError);
      expect(authError).toBeInstanceOf(ApiError);
      expect(authError.statusCode).toBe(401);
      expect(authError.data.message).toBe('Invalid token');
      
      // Validation error
      const validationError = new ValidationError('Invalid parameters', 400, { message: 'Invalid parameters' });
      expect(validationError).toBeInstanceOf(ValidationError);
      expect(validationError).toBeInstanceOf(ApiError);
      expect(validationError.statusCode).toBe(400);
      expect(validationError.data.message).toBe('Invalid parameters');
      
      // Network error
      const networkError = new NetworkError('Network Error');
      expect(networkError).toBeInstanceOf(NetworkError);
      expect(networkError).toBeInstanceOf(ApiError);
      expect(networkError.message).toBe('Network Error');
      
      // Rate limit error
      const rateLimitError = new RateLimitError('Too many requests');
      expect(rateLimitError).toBeInstanceOf(RateLimitError);
      expect(rateLimitError).toBeInstanceOf(ApiError);
      expect(rateLimitError.message).toBe('Too many requests');
      
      // Server error
      const serverError = new ServerError('Internal server error');
      expect(serverError).toBeInstanceOf(ServerError);
      expect(serverError).toBeInstanceOf(ApiError);
      expect(serverError.message).toBe('Internal server error');
    });

    it('should propagate errors in request method', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      
      const mockError = new Error('Something went wrong');
      (axiosInstance.request as jest.Mock).mockRejectedValueOnce(mockError);
      
      await expect(client.request({
        endpoint: '/test'
      })).rejects.toThrow('Something went wrong');
    });

    it('should transform 401 response to AuthenticationError', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      
      // Create a mock axios error with 401 status
      const mockAxiosError = {
        response: {
          status: 401,
          data: { message: 'Invalid token' }
        },
        request: {},
        config: {},
        isAxiosError: true,
        toJSON: () => ({}),
        message: 'Request failed with status code 401'
      } as any;
      
      // Configure axios mock to reject with our error
      mockAxios.create.mockReturnValueOnce({
        defaults: { headers: { common: {} } },
        request: jest.fn().mockRejectedValueOnce(mockAxiosError),
        interceptors: {
          response: {
            use: jest.fn((successFn, errorFn) => {
              return () => {};
            })
          }
        }
      } as any);
      
      try {
        await client.request({ endpoint: '/test' });
        fail('Request should have thrown an error');
      } catch (error) {
        expect((error as any)).toBeInstanceOf(AuthenticationError);
      }
    });

    it('should transform 400 response to ValidationError', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      
      // Create a mock axios error with 400 status
      const mockAxiosError = {
        response: {
          status: 400,
          data: { message: 'Invalid parameters' }
        },
        request: {},
        config: {},
        isAxiosError: true,
        toJSON: () => ({}),
        message: 'Request failed with status code 400'
      } as any;
      
      // Directly invoke the error handler instead of using request method
      try {
        (axiosInstance.request as jest.Mock).mockRejectedValueOnce(mockAxiosError);
        await client.request({
          endpoint: '/test'
        });
        // Should not reach here
        fail('Request should have thrown an error');
      } catch (err) {
        const error = err as ApiError;
        expect(error).toBeInstanceOf(ValidationError);
      }
    });

    it('should transform 429 response to RateLimitError', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      
      // Create a mock axios error with 429 status
      const mockAxiosError = {
        response: {
          status: 429,
          data: { message: 'Too many requests' },
          headers: {
            'retry-after': '30'
          }
        },
        request: {},
        config: {},
        isAxiosError: true,
        toJSON: () => ({}),
        message: 'Request failed with status code 429'
      } as any;
      
      // Directly invoke the error handler instead of using request method
      try {
        (axiosInstance.request as jest.Mock).mockRejectedValueOnce(mockAxiosError);
        await client.request({
          endpoint: '/test'
        });
        // Should not reach here
        expect(true).toBe(false); 
      } catch (error) {
        expect((error as any)).toBeInstanceOf(RateLimitError);
      }
    });

    it('should transform 500 response to ServerError', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      
      // Create a mock axios error with 500 status
      const mockAxiosError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        },
        request: {},
        config: {},
        isAxiosError: true,
        toJSON: () => ({}),
        message: 'Request failed with status code 500'
      } as any;
      
      // Directly invoke the error handler instead of using request method
      try {
        (axiosInstance.request as jest.Mock).mockRejectedValueOnce(mockAxiosError);
        await client.request({
          endpoint: '/test'
        });
        // Should not reach here
        expect(true).toBe(false); 
      } catch (error) {
        expect((error as any)).toBeInstanceOf(ServerError);
      }
    });

    it('should transform network error (no response) to NetworkError', async () => {
      const client = new PluggedInClient({ apiToken: 'test-token' });
      const axiosInstance = mockAxios.create();
      
      // Create a mock axios error with no response (network error)
      const mockAxiosError = {
        request: {},
        config: {},
        isAxiosError: true,
        message: 'Network Error',
        toJSON: () => ({})
      } as any;
      
      // Directly invoke the error handler instead of using request method
      try {
        (axiosInstance.request as jest.Mock).mockRejectedValueOnce(mockAxiosError);
        await client.request({
          endpoint: '/test'
        });
        // Should not reach here
        expect(true).toBe(false); 
      } catch (error) {
        expect((error as any)).toBeInstanceOf(NetworkError);
      }
    });
  });
});