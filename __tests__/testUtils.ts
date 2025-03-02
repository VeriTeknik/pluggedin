import { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';

/**
 * Custom interface for test axios instances that relaxes type constraints
 */
export interface TestAxiosInstance extends Partial<AxiosInstance> {
  request: jest.Mock;
  defaults: {
    headers: any; // Relaxed typing for headers
  };
  interceptors: {
    request: {
      use: jest.Mock;
      eject: jest.Mock;
      clear: jest.Mock;
    };
    response: {
      use: jest.Mock;
      eject: jest.Mock;
      clear: jest.Mock;
    };
  };
}

/**
 * Creates a mock Axios instance with configurable response for testing
 * @param mockResponse The response to return from the request method
 * @returns A mock Axios instance
 */
export function createMockAxiosInstance(mockResponse: any = {}): TestAxiosInstance {
  const mockRequest = jest.fn();
  mockRequest.mockResolvedValue(mockResponse);
  
  return {
    request: mockRequest,
    defaults: {
      headers: {
        common: { 'Accept': 'application/json, text/plain, */*' },
        delete: { 'Content-Type': null },
        get: { 'Content-Type': null },
        head: { 'Content-Type': null },
        post: { 'Content-Type': 'application/json' },
        put: { 'Content-Type': 'application/json' },
        patch: { 'Content-Type': 'application/json' }
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
}

/**
 * Creates a mock Axios response for testing
 * @param data The response data
 * @param status The HTTP status code
 * @param headers Optional response headers
 * @returns A mock Axios response
 */
export function createMockResponse<T = any>(
  data: T, 
  status: number = 200, 
  headers: Record<string, string> = {}
): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers,
    config: {} as AxiosRequestConfig,
  } as AxiosResponse<T>;
}

/**
 * Creates a mock JSON response
 * @param data The JSON data to include in the response
 * @param status The HTTP status code
 * @returns A mock Axios response with JSON content type
 */
export function createJsonResponse<T = Record<string, any>>(
  data: T,
  status: number = 200
): AxiosResponse<T> {
  return createMockResponse(
    data,
    status,
    { 'content-type': 'application/json' }
  );
}

/**
 * Creates a mock text response
 * @param text The text content
 * @param status The HTTP status code
 * @returns A mock Axios response with text content type
 */
export function createTextResponse(
  text: string,
  status: number = 200
): AxiosResponse<string> {
  return createMockResponse(
    text,
    status,
    { 'content-type': 'text/plain' }
  );
}

/**
 * Creates a mock binary response
 * @param data The binary data
 * @param mimeType The MIME type
 * @param status The HTTP status code
 * @returns A mock Axios response with appropriate content type
 */
export function createBinaryResponse(
  data: Uint8Array | ArrayBuffer | Buffer,
  mimeType: string = 'application/octet-stream',
  status: number = 200
): AxiosResponse<any> {
  return createMockResponse(
    data,
    status,
    { 'content-type': mimeType }
  );
}