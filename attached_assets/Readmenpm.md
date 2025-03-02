# Plugged.in NPM Package Development Guidelines

This document provides guidance for creating a modern, type-safe Node.js client library for interacting with the Plugged.in API.

## Project Goals

Create a JavaScript/TypeScript client library for Plugged.in that provides:
- Simple, intuitive interface for making AI queries
- Comprehensive TypeScript support with detailed type definitions
- Reliable error handling with specific error types
- Support for advanced features like RAG, custom instructions, and encoding options
- High test coverage and reliability

## Core API Design

### PluggedInClient Class

```typescript
export interface PluggedInOptions {
  apiToken?: string;
  apiUrl?: string;
  timeout?: number;
  defaultModel?: string;
  defaultInputEncoding?: InputEncoding;
  defaultOutputEncoding?: OutputEncoding;
  retryConfig?: RetryConfig;
}

export class PluggedInClient {
  constructor(options?: PluggedInOptions);
  
  // Token management
  setToken(token: string): void;
  clearToken(): void;
  
  // Standard query with multiple input/output formats 
  query(
    prompt: string | Buffer | ArrayBuffer,
    pluggrId?: string | PluggrConfig,
    customInstructions?: string,
    params?: QueryParams
  ): Promise<QueryResponse>;
  
  // Direct AI model access
  rawQuery(
    prompt: string | Buffer | ArrayBuffer,
    options: RawQueryOptions
  ): Promise<QueryResponse>;
  
  // Low-level request handling
  request<T = any>(config: RequestConfig): Promise<ResponseData<T>>;
}
```

### Input and Output Encodings

```typescript
export type InputEncoding = 'text' | 'json' | 'image' | 'audio' | 'video' | 'binary';
export type OutputEncoding = 'text' | 'json' | 'audio' | 'image' | 'markdown' | 'html' | 'xml';

export interface EncodingOptions {
  inputEncoding?: InputEncoding;
  outputEncoding?: OutputEncoding;
  formatOptions?: FormatOptions;
}

export interface FormatOptions {
  // Options specific to each encoding type
  json?: JsonFormatOptions;
  markdown?: MarkdownFormatOptions;
  html?: HtmlFormatOptions;
  // etc.
}
```

### Query Options

```typescript
export interface QueryParams extends EncodingOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  attachments?: Attachment[];
  context?: ContextInfo;
  metadata?: Record<string, any>;
}

export interface RawQueryOptions extends QueryParams {
  model: string;
  customInstructions?: string;
}

export interface PluggrConfig {
  id: string;
  version?: string;
  config?: Record<string, any>;
}

export interface Attachment {
  type: InputEncoding;
  data: string | Buffer | ArrayBuffer;
  filename?: string;
  mimeType?: string;
}

export interface ContextInfo {
  documents?: Document[];
  conversationId?: string;
  previousMessages?: Message[];
}
```

### Response Types

```typescript
export interface QueryResponse<T = any> {
  id: string;
  result: T;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
  };
  inputEncoding: InputEncoding;
  outputEncoding: OutputEncoding;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ResponseData<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
}
```

### Error Handling

```typescript
export class ApiError extends Error {
  status?: number;
  code?: string;
  data?: any;
}

export class AuthenticationError extends ApiError {}
export class ValidationError extends ApiError {}
export class RateLimitError extends ApiError {}
export class ServerError extends ApiError {}
export class NetworkError extends ApiError {}
```

## Prompt for Replit AI

```
Create a modern TypeScript npm package for interacting with the Plugged.in API. The client library should provide an intuitive interface for making AI queries with support for multiple input and output encodings.

Key requirements:

1. Create a `PluggedInClient` class with configurable options:
   - apiUrl: Custom API URL (defaults to https://api.plugged.in)
   - apiToken: Authentication token
   - timeout: Request timeout in milliseconds
   - defaultInputEncoding: Default input format (text, json, image, etc.)
   - defaultOutputEncoding: Default output format (text, json, markdown, etc.)
   - retryConfig: Options for automatic retry on failures

2. Enhanced query interface:
   - query(prompt, pluggrId?, customInstructions?, params?) for standard queries
     - Support for text, image, audio, or video inputs via proper encoding
     - Support for text, json, markdown, html, or other output formats
   - rawQuery(prompt, options) for direct AI model access
     - Support for all encoding options

3. Token management:
   - setToken(token) to set authentication token
   - clearToken() to remove authentication token

4. Request handling:
   - request<T>(config) for low-level API requests
   - Support for TypeScript generics for type-safe responses

5. Error handling:
   - Specific error types (AuthenticationError, ValidationError, etc.)
   - Automatic retry mechanism for recoverable errors
   - Detailed error information including retry-after data

6. Multi-format support:
   - Handle text, JSON, binary data, images, audio, and video inputs
   - Process various output formats like text, JSON, markdown, and HTML
   - Proper MIME type handling and content negotiation

7. Advanced features:
   - Streaming response support
   - RAG (Retrieval Augmented Generation) via context parameter
   - Conversation history maintenance
   - File attachments and multi-part requests

Include comprehensive TypeScript type definitions, detailed JSDoc comments, and write the package with a focus on developer experience. Ensure high test coverage (>95%) using Jest, and include examples for common use cases.
```

## Implementation Guidelines

### Project Structure

```
/src
  /errors        # Error classes
  /types         # TypeScript type definitions
  /utils         # Utility functions
  /encoding      # Input/output encoding handlers
  client.ts      # Main PluggedInClient class
  index.ts       # Package entry point
/tests
  /unit          # Unit tests
  /integration   # Integration tests
  /mocks         # Test mocks and fixtures
.github
  /workflows     # CI/CD workflows
```

### Technical Guidelines

1. **Modern JavaScript**
   - Use ES2020+ features
   - Async/await for all asynchronous operations
   - Optional chaining and nullish coalescing

2. **TypeScript Best Practices**
   - Strict type checking
   - Generic types for flexible APIs
   - Union and intersection types where appropriate
   - Discriminated unions for complex types

3. **HTTP Client**
   - Use Axios for HTTP requests
   - Implement request/response interceptors
   - Handle file uploads and multipart requests

4. **Documentation**
   - Comprehensive JSDoc comments
   - README with examples for common use cases
   - TypeScript type definitions (.d.ts files)

5. **Testing**
   - Jest for unit and integration tests
   - Mock HTTP requests with nock or msw
   - Test error scenarios thoroughly
   - Aim for >95% code coverage

6. **Package Configuration**
   - Proper package.json configuration
   - TypeScript configuration for both CommonJS and ESM
   - Bundle with rollup or esbuild
   - Set appropriate npm tags and metadata

## Example Usage

```typescript
import { PluggedInClient } from '@pluggedin/query';

// Initialize with default text encoding
const client = new PluggedInClient({
  apiToken: 'your-api-token',
  defaultInputEncoding: 'text',
  defaultOutputEncoding: 'json'
});

// Text input with JSON output
const textQuery = async () => {
  const response = await client.query(
    'Generate a list of 5 product ideas for a smart home',
    'product-ideation',
    'Format as a JSON array with name, description, and price fields',
    { outputEncoding: 'json' }
  );
  console.log(response.result); // Typed as any, but is a JSON object
};

// Image input with text output
const imageQuery = async () => {
  const imageBuffer = await fs.promises.readFile('./image.jpg');
  
  const response = await client.query(
    imageBuffer,
    'image-analysis',
    'Describe the contents of this image in detail',
    { 
      inputEncoding: 'image',
      outputEncoding: 'text',
      metadata: { filename: 'image.jpg', mimeType: 'image/jpeg' }
    }
  );
  
  console.log(response.result); // Text description of the image
};

// Direct model access with custom options
const rawQuery = async () => {
  const response = await client.rawQuery(
    'Explain how transformers work in AI',
    {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
      outputEncoding: 'markdown'
    }
  );
  
  console.log(response.result); // Markdown formatted explanation
};

// Using with TypeScript generics for type safety
interface Product {
  name: string;
  description: string;
  price: number;
}

const typedQuery = async () => {
  const response = await client.query<Product[]>(
    'Generate 3 product ideas',
    'product-ideation',
    undefined,
    { outputEncoding: 'json' }
  );
  
  // response.result is now typed as Product[]
  const products = response.result;
  products.forEach(product => {
    console.log(`${product.name}: $${product.price}`);
  });
};
```

## Advanced Features Implementation

### Input Encoding Handling

Implement specialized handlers for different input types that convert to the appropriate format for API transmission:

```typescript
// Example encoder for image input
const encodeImage = (input: Buffer | ArrayBuffer, mimeType?: string): string => {
  const buffer = input instanceof ArrayBuffer ? Buffer.from(input) : input;
  return `data:${mimeType || 'image/jpeg'};base64,${buffer.toString('base64')}`;
};

// In client.query method
if (params?.inputEncoding === 'image') {
  // Convert image to base64 data URI
  if (!(prompt instanceof Buffer || prompt instanceof ArrayBuffer)) {
    throw new ValidationError('Image input must be provided as Buffer or ArrayBuffer');
  }
  
  processedPrompt = encodeImage(prompt, params.metadata?.mimeType);
}
```

### Output Encoding Processing

Handle different response formats:

```typescript
// In response processing
const processResponse = (response: any, outputEncoding: OutputEncoding): any => {
  switch (outputEncoding) {
    case 'json':
      // Ensure the response is a valid JSON object
      if (typeof response === 'string') {
        try {
          return JSON.parse(response);
        } catch (error) {
          throw new ValidationError('Failed to parse JSON response');
        }
      }
      return response;
      
    case 'markdown':
    case 'html':
    case 'text':
      // Ensure string output
      return String(response);
      
    // Handle other formats
    default:
      return response;
  }
};
```

## Quality Assurance Guidelines

### Testing Strategy

1. **Unit Tests**
   - Test each method in isolation
   - Mock external dependencies
   - Test error handling paths
   - Test different encoding combinations

2. **Integration Tests**
   - Test against a mock API server
   - Verify correct request/response handling
   - Test real-world usage scenarios
   - Test authentication flows

3. **Edge Cases**
   - Test with large inputs/outputs
   - Test network failures and retries
   - Test rate limiting scenarios
   - Test encoding edge cases

### Package Publishing

1. **Versioning**
   - Follow semantic versioning
   - Document breaking changes
   - Include migration guides for major versions

2. **Distribution**
   - Publish both ESM and CommonJS versions
   - Include source maps
   - Include TypeScript declarations
   - Minimize dependencies

3. **Documentation**
   - Include examples for all major use cases
   - Provide API reference documentation
   - Include a changelog
   - Document encoding support matrix

## License and Attribution

This package should be released under the MIT License, with appropriate attribution to Plugged.in.