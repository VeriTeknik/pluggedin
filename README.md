# query

query is a free API-to-AI service that empowers you to select your preferred model, provide custom instructions, leverage Retrieval Augmented Generation (RAG), and configure both input and output encodings—among many other features. With its clean, intuitive interface for making authenticated requests to api.plugged.in, robust TypeScript support, and comprehensive error handling, query enables developers to seamlessly integrate advanced AI capabilities into their applications, opening up a wide array of innovative possibilities in today's rapidly evolving tech landscape.

[![npm version](https://img.shields.io/npm/v/@pluggedin/query.svg)](https://www.npmjs.com/package/@pluggedin/query)
[![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://github.com/VeriTeknik/pluggedin)
[![License](https://img.shields.io/npm/l/@pluggedin/query.svg)](https://github.com/VeriTeknik/pluggedin/blob/main/LICENSE)

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Query API](#query-api)
- [Error Handling](#error-handling)
- [TypeScript Support](#typescript-support)
- [Advanced Configuration](#advanced-configuration)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Authentication**: Simplified token management for API requests
- **Error Handling**: Detailed error types for different API response scenarios
- **Request Formatting**: Simple, intuitive interface for API requests
- **Response Parsing**: Automatic parsing of API responses
- **Rate Limiting**: Handles rate limit errors with appropriate feedback
- **High Test Coverage**: 100% statement/line coverage and >90% branch coverage

## Installation

```bash
npm install @pluggedin/query
```

For Yarn users:

```bash
yarn add @pluggedin/query
```

## Basic Usage

```typescript
import { PluggedInClient } from '@pluggedin/query';

// Initialize client
const client = new PluggedInClient({
  apiToken: 'your-api-token',  // Optional, can be set later
  apiUrl: 'https://api.plugged.in',  // Optional, defaults to https://api.plugged.in
  timeout: 30000  // Optional, defaults to 30000 (30 seconds)
});

// Set or update the API token
client.setToken('your-updated-token');

// Clear the token if needed
client.clearToken();

// Make a request
try {
  const response = await client.request({
    method: 'GET',  // Optional, defaults to GET
    endpoint: '/some-endpoint',
    params: {  // Optional
      key1: 'value1',
      key2: 'value2'
    },
    data: {  // Optional, for POST, PUT, etc.
      field1: 'value1',
      field2: 'value2'
    }
  });
  
  console.log(response);
} catch (error) {
  // Errors are typed for better handling
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded:', error.message);
  } else if (error instanceof ServerError) {
    console.error('Server error:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Query API

For making AI query requests, two convenient methods are provided:

### Standard Query

The `query` method is designed for easier usage with a more intuitive parameter order:

```typescript
// Basic query with just a prompt
const results = await client.query('Tell me about TypeScript');

// Query with pluggrid ID
const resultsWithPluggrid = await client.query(
  'Summarize this article', 
  'article-summarizer-plugin'
);

// Query with pluggrid ID and custom instructions
const customResults = await client.query(
  'What is the weather like?',
  'weather-plugin',
  'Format the response in a friendly, conversational manner'
);

// Query with full pluggrid configuration
const advancedResults = await client.query(
  'Generate test cases for my function',
  {
    id: 'code-helper',
    version: '2.0',
    config: {
      language: 'typescript',
      testFramework: 'jest'
    }
  }
);

// Query with additional parameters
const paramsResults = await client.query(
  'Analyze this data',
  'data-analysis',
  undefined, // no custom instructions
  { 
    maxResults: 5,
    format: 'table'
  }
);
```

### Raw AI Query

The `rawQuery` method allows direct access to AI models without pluggrids:

```typescript
// Basic raw query
const rawResults = await client.rawQuery(
  'Explain quantum computing in simple terms',
  {
    model: 'gpt-4'
  }
);

// Advanced raw query with all options
const advancedRawResults = await client.rawQuery(
  'Generate JSON data for a product catalog',
  {
    model: 'gpt-4',
    customInstructions: 'Generate 5 products with name, price, and description fields',
    inputEncoding: 'text',
    outputEncoding: 'json',
    temperature: 0.7,
    maxTokens: 1000
  }
);
```

## Error Handling

The library provides detailed error types for different scenarios:

```typescript
import { 
  ApiError,              // Base error class
  AuthenticationError,   // 401 errors
  ValidationError,       // 400 errors
  NetworkError,          // Network connectivity issues
  RateLimitError,        // 429 errors
  ServerError            // 500, 503, etc. errors
} from '@pluggedin/query';

try {
  const response = await client.request({ endpoint: '/data' });
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Handle authentication issues
  } else if (error instanceof ValidationError) {
    // Handle validation issues
  } else if (error instanceof RateLimitError) {
    // Handle rate limiting
    console.log(`Retry after: ${error.data.retryAfter || 'unknown'}`);
  } else if (error instanceof ServerError) {
    // Handle server errors
  } else if (error instanceof NetworkError) {
    // Handle network issues
  } else if (error instanceof ApiError) {
    // Handle other API errors
  } else {
    // Handle unexpected errors
  }
}
```

## TypeScript Support

The library includes comprehensive TypeScript definitions for all client options, request parameters, and response types:

```typescript
import { 
  PluggedInOptions,   // Client configuration
  RequestConfig,      // Request parameters
  ResponseData,       // Response structure
  PluggridConfig,     // Pluggrid configuration
  RequestParams       // Request parameters
} from '@pluggedin/query';

// Use with generic type parameters for type-safe responses
interface User {
  id: string;
  name: string;
  email: string;
}

const response = await client.request<User[]>({
  endpoint: '/users'
});

// Now response.data is typed as User[]
const users = response.data;
```

## Advanced Configuration

### Custom Headers

```typescript
const response = await client.request({
  endpoint: '/endpoint',
  headers: {
    'X-Custom-Header': 'custom-value',
    'X-Another-Header': 'another-value'
  }
});
```

### Timeout Configuration

```typescript
// Set timeout during initialization
const client = new PluggedInClient({
  apiToken: 'your-token',
  timeout: 60000  // 60 seconds
});

// Or for individual requests (not supported by default)
// Would require axios config extension
```

## Development

### Requirements

- Node.js 14.x or higher
- npm or yarn

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/VeriTeknik/pluggedin.git
cd pluggedin

# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Testing

The project maintains high test coverage and uses Jest for testing:

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode during development
npm run test:watch
```

Current test coverage metrics:
- Statement coverage: 100%
- Branch coverage: 92.2%
- Function coverage: 94.73%
- Line coverage: 100%

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

Please ensure your code maintains the high test coverage standards of the project.

## License

This project is licensed under the ISC License - see the [LICENSE](https://github.com/VeriTeknik/pluggedin/blob/main/LICENSE) file for details.
