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
import { 
  createMockAxiosInstance, 
  TestAxiosInstance, 
  createJsonResponse, 
  createTextResponse,
  createBinaryResponse
} from './testUtils';

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
    
    // Mock axios.create with our utility
    mockAxios.create.mockReturnValue(createMockAxiosInstance() as any);
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
        defaults: { 
      // @ts-ignore - Axios types compatibility
          headers: { 
            common: {},
            delete: {},
            get: {},
            head: {},
            post: {},
            put: {},
            patch: {} 
          } 
        },
        request: jest.fn(),
        interceptors: {
          request: {
            use: jest.fn(),
            eject: jest.fn(),
            clear: jest.fn()
          },
          response: { 
            use: useResponseInterceptor,
            eject: jest.fn(),
            clear: jest.fn()  
          }
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
      const mockInstance = createMockAxiosInstance();
      mockInstance.defaults.headers.common['Authorization'] = 'Bearer test-token';
      mockAxios.create.mockReturnValueOnce(mockInstance as any);
      
      const client = new PluggedInClient({ apiToken: 'test-token' });
      client.clearToken();
      
      expect(mockInstance.defaults.headers.common['Authorization']).toBeUndefined();
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
      // Set up mock instance with our utility
      const mockInstance = createMockAxiosInstance();
      const mockResponse = createJsonResponse({ 
        status: 'success', 
        data: { result: 'test' } 
      });
      
      mockInstance.request.mockResolvedValueOnce(mockResponse);
      mockAxios.create.mockReturnValueOnce(mockInstance as any);
      
      const client = new PluggedInClient({ apiToken: 'test-token' });
      
      const response = await client.request({
        method: 'POST',
        endpoint: '/test',
        data: { key: 'value' }
      });
      
      expect(mockInstance.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/test',
        data: { key: 'value' }
      }));
      
      expect(response).toEqual({ 
        status: 'success', 
        data: { result: 'test' },
        statusCode: 200,
        headers: expect.objectContaining({ 'content-type': 'application/json' })
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
      
      // Create a custom mockInstance using our utility
      const mockInstance = createMockAxiosInstance();
      
      // First call fails with 429 status
      const rateLimitError = {
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' },
          headers: {}
        },
        config: {},
        isAxiosError: true,
        toJSON: () => ({})
      };
      
      // Second call succeeds with a JSON response
      const successResponse = createJsonResponse({ 
        data: {
          result: 'Success after retry'
        }
      });
      
      // Setup the mock request behavior
      mockInstance.request
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(successResponse);
        
      // Directly inject the mock axios instance into the client
      // @ts-ignore - accessing private property for testing
      client.axiosInstance = mockInstance;
      
      // Mock setTimeout
      jest.useFakeTimers();
      
      // Start the request
      const requestPromise = client.request({
        endpoint: '/test'
      });
      
      // Fast-forward timers to simulate waiting for retry
      jest.runAllTimers();
      
      // Wait for the promise to resolve
      const result = await requestPromise;
      
      // Expect the request to have been called twice
      expect(mockInstance.request).toHaveBeenCalledTimes(2);
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
      
      // Error with retry-after header
      const errorWithRetryAfter = {
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' },
      // @ts-ignore - Axios types compatibility
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
      
      // Create a mock axios instance with the expected behavior
      const mockAxiosRequest = jest.fn()
        .mockRejectedValueOnce(errorWithRetryAfter)
        .mockResolvedValueOnce(successResponse);
        
      // Directly inject the mock axios instance into the client
      // @ts-ignore - accessing private property for testing
      client.axiosInstance = {
        request: mockAxiosRequest,
        defaults: { 
      // @ts-ignore - Axios types compatibility
          headers: { 
            common: { "Accept": "application/json, text/plain, */*" },
            delete: { "Content-Type": null },
            get: { "Content-Type": null },
            head: { "Content-Type": null },
            post: { "Content-Type": "application/json" },
            put: { "Content-Type": "application/json" },
            patch: { "Content-Type": "application/json" } 
          } 
        },
        interceptors: {
          request: {
            use: jest.fn(),
            eject: jest.fn(),
            clear: jest.fn()
          },
          response: { 
            use: jest.fn(),
            eject: jest.fn(),
            clear: jest.fn()  
          }
        }
      };
      
      // Mock setTimeout
      jest.useFakeTimers();
      
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
      expect(mockAxiosRequest).toHaveBeenCalledTimes(2);
      
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
      
      // Create a mock axios instance with the expected behavior
      const mockAxiosRequest = jest.fn().mockRejectedValue(serverError);
        
      // Directly inject the mock axios instance into the client
      // @ts-ignore - accessing private property for testing
      client.axiosInstance = {
        request: mockAxiosRequest,
        defaults: { 
      // @ts-ignore - Axios types compatibility
          headers: { 
            common: { "Accept": "application/json, text/plain, */*" },
            delete: { "Content-Type": null },
            get: { "Content-Type": null },
            head: { "Content-Type": null },
            post: { "Content-Type": "application/json" },
            put: { "Content-Type": "application/json" },
            patch: { "Content-Type": "application/json" } 
          } 
        },
        interceptors: {
          request: {
            use: jest.fn(),
            eject: jest.fn(),
            clear: jest.fn()
          },
          response: { 
            use: jest.fn(),
            eject: jest.fn(),
            clear: jest.fn()  
          }
        }
      };
      
      // Mock setTimeout
      jest.useFakeTimers();
      
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
      expect(mockAxiosRequest).toHaveBeenCalledTimes(3);
      
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
    
    it('should test shouldRetryRequest internal method', () => {
      const client = new PluggedInClient({ 
        apiToken: 'test-token',
        retryConfig: {
          maxRetries: 3,
          retryStatusCodes: [429, 500, 502, 503, 504]
        }
      });
      
      // Create a mock axios error with 500 status
      const errorWith500 = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        },
        isAxiosError: true
      } as any;
      
      // Create a mock axios error with 400 status
      const errorWith400 = {
        response: {
          status: 400,
          data: { message: 'Bad request' }
        },
        isAxiosError: true
      } as any;
      
      // Create a mock axios error with 429 status
      const errorWith429 = {
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' }
        },
        isAxiosError: true
      } as any;
      
      // Direct access to the shouldRetryRequest method
      const shouldRetryRequest = (client as any).shouldRetryRequest.bind(client);
      
      // Should retry 500 error on first attempt
      expect(shouldRetryRequest(errorWith500, 0)).toBe(true);
      
      // Should not retry 400 error
      expect(shouldRetryRequest(errorWith400, 0)).toBe(false);
      
      // Should retry 429 error on first attempt
      expect(shouldRetryRequest(errorWith429, 0)).toBe(true);
      
      // Should not retry when max retries reached
      expect(shouldRetryRequest(errorWith500, 3)).toBe(false);
    });
    
    it('should support custom retry condition', () => {
      // Set up a client with a custom retry condition that only retries on status 418
      const client = new PluggedInClient({ 
        apiToken: 'test-token',
        retryConfig: {
          maxRetries: 3,
          retryStatusCodes: [], // No status codes by default
          retryCondition: (error: any) => {
            return error.isAxiosError && error.response?.status === 418;
          }
        }
      });
      
      // Create various test errors
      const errorWith418 = {
        response: {
          status: 418,
          data: { message: "I'm a teapot" }
        },
        isAxiosError: true
      } as any;
      
      const errorWith500 = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        },
        isAxiosError: true
      } as any;
      
      // Direct access to the shouldRetryRequest method
      const shouldRetryRequest = (client as any).shouldRetryRequest.bind(client);
      
      // Should retry 418 error (custom condition)
      expect(shouldRetryRequest(errorWith418, 0)).toBe(true);
      
      // Should not retry 500 error (not in custom condition)
      expect(shouldRetryRequest(errorWith500, 0)).toBe(false);
    });
  });
});