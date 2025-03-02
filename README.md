# Plugged.in API Client

A TypeScript client library for accessing the [api.plugged.in](https://api.plugged.in) service with a clean and type-safe interface.

## Features

- TypeScript-first design with comprehensive type definitions
- Robust error handling with specific error types
- Secure token management
- Flexible request formatting and response parsing
- High test coverage (>99% statement/line coverage)

## Installation

```bash
npm install plugged-in-api
```

## Basic Usage

```typescript
import PluggedInClient from 'plugged-in-api';

// Create a client instance
const client = new PluggedInClient({
  apiToken: 'your-api-token',
});

// Make a standard query
const response = await client.query(
  'Summarize this article',
  { id: 'text-summarizer' },
  'Focus on key technical details'
);

console.log(response.data);
```

## API Reference

### Constructor

```typescript
const client = new PluggedInClient({
  apiUrl?: string,      // Defaults to https://api.plugged.in
  apiToken?: string,    // Optional API token
  timeout?: number      // Request timeout in ms (default: 30000)
});
```

### Methods

#### Query

Make a query using a pluggrid.

```typescript
const response = await client.query<ResponseType>(
  prompt: string,
  pluggridConfig: string | PluggridConfig,
  customInstructions?: string,
  params?: RequestParams
);
```

#### Raw Query

Make a direct AI query without using pluggrids.

```typescript
const response = await client.rawQuery<ResponseType>(
  prompt: string,
  options: RawQueryOptions
);
```

#### Request

Make a low-level API request.

```typescript
const response = await client.request<ResponseType>({
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  endpoint: string,
  params?: RequestParams,
  data?: any,
  headers?: Record<string, string>
});
```

#### Token Management

```typescript
// Set API token
client.setToken('your-api-token');

// Clear API token
client.clearToken();
```

### Error Handling

The library provides specific error types for different error scenarios:

- `ApiError`: Base error class for all API errors
- `AuthenticationError`: Authentication failures (401)
- `ValidationError`: Invalid request parameters (400)
- `NetworkError`: Network connectivity issues
- `RateLimitError`: Rate limit exceeded (429)
- `ServerError`: Server-side errors (500)

Example:

```typescript
import { ValidationError } from 'plugged-in-api';

try {
  const response = await client.query('My prompt', 'invalid-pluggrid-id');
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Invalid parameters:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## License

MIT