import { 
  ApiError, 
  AuthenticationError, 
  ValidationError, 
  NetworkError,
  RateLimitError,
  ServerError
} from '../src/errors';

describe('Error classes', () => {
  describe('ApiError', () => {
    it('should create with default values', () => {
      const error = new ApiError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ApiError');
      expect(error.statusCode).toBe(0);
      expect(error.data).toEqual({});
    });

    it('should create with custom values', () => {
      const error = new ApiError('Custom error', 418, { code: 'TEA_POT' });
      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(418);
      expect(error.data).toEqual({ code: 'TEA_POT' });
    });
  });

  describe('AuthenticationError', () => {
    it('should create with proper name and defaults', () => {
      const error = new AuthenticationError('Auth error');
      expect(error.message).toBe('Auth error');
      expect(error.name).toBe('AuthenticationError');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('ValidationError', () => {
    it('should create with proper name and defaults', () => {
      const error = new ValidationError('Validation error');
      expect(error.message).toBe('Validation error');
      expect(error.name).toBe('ValidationError');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('NetworkError', () => {
    it('should create with proper name and defaults', () => {
      const error = new NetworkError('Network error');
      expect(error.message).toBe('Network error');
      expect(error.name).toBe('NetworkError');
      expect(error.statusCode).toBe(0);
    });
  });

  describe('RateLimitError', () => {
    it('should create with proper name and defaults', () => {
      const error = new RateLimitError('Rate limit error');
      expect(error.message).toBe('Rate limit error');
      expect(error.name).toBe('RateLimitError');
      expect(error.statusCode).toBe(429);
    });
  });

  describe('ServerError', () => {
    it('should create with proper name and defaults', () => {
      const error = new ServerError('Server error');
      expect(error.message).toBe('Server error');
      expect(error.name).toBe('ServerError');
      expect(error.statusCode).toBe(500);
    });
  });
});