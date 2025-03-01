import { buildUrl, validateParams, safeJsonParse, isPlainObject } from '../src/utils';
import { ValidationError } from '../src/errors';

describe('Utils', () => {
  describe('buildUrl', () => {
    it('should return endpoint when no params are provided', () => {
      expect(buildUrl('/test')).toBe('/test');
      expect(buildUrl('/test', {})).toBe('/test');
    });

    it('should append params to URL', () => {
      const result = buildUrl('/test', { param1: 'value1', param2: 'value2' });
      expect(result).toBe('/test?param1=value1&param2=value2');
    });

    it('should handle object params by stringifying them', () => {
      const result = buildUrl('/test', { obj: { key: 'value' } });
      expect(result).toBe('/test?obj=%7B%22key%22%3A%22value%22%7D');
    });

    it('should ignore null or undefined params', () => {
      const result = buildUrl('/test', { param1: 'value1', param2: null, param3: undefined });
      expect(result).toBe('/test?param1=value1');
    });
  });

  describe('validateParams', () => {
    it('should not throw for valid params', () => {
      expect(() => validateParams({})).not.toThrow();
      expect(() => validateParams({ query: 'test' })).not.toThrow();
      expect(() => validateParams({ pluggrid: { id: 'test' } })).not.toThrow();
    });

    it('should throw for non-object params', () => {
      expect(() => validateParams(null as any)).toThrow(ValidationError);
      expect(() => validateParams('string' as any)).toThrow(ValidationError);
    });

    it('should throw for invalid query type', () => {
      expect(() => validateParams({ query: 123 as any })).toThrow(ValidationError);
    });

    it('should throw for invalid pluggrid type', () => {
      expect(() => validateParams({ pluggrid: 'string' as any })).toThrow(ValidationError);
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      expect(safeJsonParse('{"key":"value"}')).toEqual({ key: 'value' });
      expect(safeJsonParse('["item1","item2"]')).toEqual(['item1', 'item2']);
    });

    it('should return null for invalid JSON', () => {
      expect(safeJsonParse('invalid json')).toBeNull();
      expect(safeJsonParse('{key:value}')).toBeNull();
    });
  });

  describe('isPlainObject', () => {
    it('should return true for plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ key: 'value' })).toBe(true);
    });

    it('should return false for non-plain objects', () => {
      expect(isPlainObject(null)).toBe(false);
      expect(isPlainObject(undefined)).toBe(false);
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject('string')).toBe(false);
      expect(isPlainObject(123)).toBe(false);
      expect(isPlainObject(new Date())).toBe(false);
      expect(isPlainObject(new Error())).toBe(false);
    });
  });
});
