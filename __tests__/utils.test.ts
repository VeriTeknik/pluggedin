import { 
  buildUrl, 
  validateParams, 
  safeJsonParse, 
  isPlainObject,
  isBuffer,
  isArrayBuffer,
  encodeInput,
  getContentType,
  getExtensionFromMimeType,
  processOutputEncoding,
  processJsonOutput,
  processMarkdownOutput,
  processHtmlOutput,
  extractHeadings,
  generateToc,
  isValidInputEncoding,
  isValidOutputEncoding
} from '../src/utils';
import { ValidationError } from '../src/errors';
import { InputEncoding } from '../src/types';

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
  
  describe('isBuffer', () => {
    it('should return true for Buffer objects', () => {
      expect(isBuffer(Buffer.from('test'))).toBe(true);
    });
    
    it('should return false for non-Buffer values', () => {
      expect(isBuffer(null)).toBe(false);
      expect(isBuffer('string')).toBe(false);
      expect(isBuffer(123)).toBe(false);
      expect(isBuffer({})).toBe(false);
      expect(isBuffer([])).toBe(false);
      expect(isBuffer(new ArrayBuffer(10))).toBe(false);
    });
  });
  
  describe('isArrayBuffer', () => {
    it('should return true for ArrayBuffer objects', () => {
      expect(isArrayBuffer(new ArrayBuffer(10))).toBe(true);
    });
    
    it('should return false for non-ArrayBuffer values', () => {
      expect(isArrayBuffer(null)).toBe(false);
      expect(isArrayBuffer('string')).toBe(false);
      expect(isArrayBuffer(123)).toBe(false);
      expect(isArrayBuffer({})).toBe(false);
      expect(isArrayBuffer([])).toBe(false);
      expect(isArrayBuffer(Buffer.from('test'))).toBe(false);
    });
  });
  
  describe('isValidInputEncoding', () => {
    it('should return true for valid input encodings', () => {
      expect(isValidInputEncoding('text')).toBe(true);
      expect(isValidInputEncoding('json')).toBe(true);
      expect(isValidInputEncoding('image')).toBe(true);
      expect(isValidInputEncoding('audio')).toBe(true);
      expect(isValidInputEncoding('video')).toBe(true);
      expect(isValidInputEncoding('binary')).toBe(true);
    });
    
    it('should return false for invalid input encodings', () => {
      expect(isValidInputEncoding('invalid')).toBe(false);
      expect(isValidInputEncoding('')).toBe(false);
      expect(isValidInputEncoding(null as any)).toBe(false);
    });
  });
  
  describe('isValidOutputEncoding', () => {
    it('should return true for valid output encodings', () => {
      expect(isValidOutputEncoding('text')).toBe(true);
      expect(isValidOutputEncoding('json')).toBe(true);
      expect(isValidOutputEncoding('markdown')).toBe(true);
      expect(isValidOutputEncoding('html')).toBe(true);
      expect(isValidOutputEncoding('xml')).toBe(true);
      expect(isValidOutputEncoding('audio')).toBe(true);
      expect(isValidOutputEncoding('image')).toBe(true);
    });
    
    it('should return false for invalid output encodings', () => {
      expect(isValidOutputEncoding('invalid')).toBe(false);
      expect(isValidOutputEncoding('')).toBe(false);
      expect(isValidOutputEncoding(null as any)).toBe(false);
    });
  });
  
  describe('getContentType', () => {
    it('should return correct content type for text encoding', () => {
      expect(getContentType('text')).toBe('text/plain');
    });
    
    it('should return correct content type for json encoding', () => {
      expect(getContentType('json')).toBe('application/json');
    });
    
    it('should return correct content type for image encoding with default MIME type', () => {
      expect(getContentType('image')).toBe('image/jpeg');
    });
    
    it('should return specified MIME type when provided', () => {
      expect(getContentType('image', 'image/png')).toBe('image/png');
      expect(getContentType('audio', 'audio/mp3')).toBe('audio/mp3');
    });
  });
  
  describe('getExtensionFromMimeType', () => {
    it('should return correct extension for common MIME types', () => {
      expect(getExtensionFromMimeType('image/jpeg')).toBe('jpg');
      expect(getExtensionFromMimeType('image/png')).toBe('png');
      expect(getExtensionFromMimeType('audio/mp3')).toBe('mp3');
      expect(getExtensionFromMimeType('audio/mpeg')).toBe('mp3');
      expect(getExtensionFromMimeType('video/mp4')).toBe('mp4');
      expect(getExtensionFromMimeType('application/pdf')).toBe('pdf');
    });
    
    it('should return bin for unknown MIME types', () => {
      expect(getExtensionFromMimeType('unknown/type')).toBe('bin');
    });
  });
  
  describe('encodeInput', () => {
    it('should properly encode text input', () => {
      const result = encodeInput('Hello world', 'text');
      expect(result).toBe('Hello world');
    });
    
    it('should properly encode JSON input', () => {
      const data = { key: 'value' };
      const result = encodeInput(data, 'json');
      expect(result).toBe(JSON.stringify(data));
    });
    
    it('should encode Buffer data to base64 for binary types', () => {
      const buffer = Buffer.from('test data');
      const result = encodeInput(buffer, 'binary');
      expect(result).toBe(buffer.toString('base64'));
    });
    
    it('should encode ArrayBuffer data to base64 for binary types', () => {
      const buffer = new ArrayBuffer(4);
      const view = new Uint8Array(buffer);
      view[0] = 116; // 't'
      view[1] = 101; // 'e'
      view[2] = 115; // 's'
      view[3] = 116; // 't'
      
      const result = encodeInput(buffer, 'binary');
      expect(result).toBe(Buffer.from(buffer).toString('base64'));
    });
    
    it('should throw an error for unsupported input types', () => {
      expect(() => {
        // Use a non-binary value for a binary encoding - this should throw
        const invalidValue = 123 as unknown as Buffer;
        return encodeInput(invalidValue, 'binary');
      }).toThrow();
    });
  });
  
  describe('processOutputEncoding', () => {
    it('should process JSON output', () => {
      const jsonData = { key: 'value' };
      const result = processOutputEncoding(jsonData, 'json');
      expect(result).toEqual(jsonData);
    });
    
    it('should process text output', () => {
      const result = processOutputEncoding('Hello world', 'text');
      expect(result).toBe('Hello world');
    });
    
    it('should convert non-string data to string for text output', () => {
      const result = processOutputEncoding({ key: 'value' }, 'text');
      expect(typeof result).toBe('string');
    });
    
    it('should process markdown output', () => {
      const markdown = '# Heading\nContent';
      const result = processOutputEncoding(markdown, 'markdown');
      expect(result).toEqual(markdown);
    });
    
    it('should process html output', () => {
      const html = '<div>Content</div>';
      const result = processOutputEncoding(html, 'html');
      expect(result).toEqual(html);
    });
  });
  
  describe('extractHeadings', () => {
    it('should extract headings from markdown text', () => {
      const markdown = '# Heading 1\nContent\n## Heading 2\nMore content\n### Heading 3';
      const headings = extractHeadings(markdown);
      
      expect(headings).toHaveLength(3);
      expect(headings[0]).toEqual({ level: 1, text: 'Heading 1' });
      expect(headings[1]).toEqual({ level: 2, text: 'Heading 2' });
      expect(headings[2]).toEqual({ level: 3, text: 'Heading 3' });
    });
    
    it('should handle empty input', () => {
      const headings = extractHeadings('');
      expect(headings).toHaveLength(0);
    });
    
    it('should handle input with no headings', () => {
      const headings = extractHeadings('Just plain text\nwith no headings');
      expect(headings).toHaveLength(0);
    });
  });
  
  describe('generateToc', () => {
    it('should generate a table of contents from headings', () => {
      const headings = [
        { level: 1, text: 'Heading 1' },
        { level: 2, text: 'Heading 2' },
        { level: 2, text: 'Another H2' },
        { level: 3, text: 'Heading 3' }
      ];
      
      const toc = generateToc(headings, 1);
      const expected = 
        '- [Heading 1](#heading-1)\n' +
        '  - [Heading 2](#heading-2)\n' +
        '  - [Another H2](#another-h2)\n' +
        '    - [Heading 3](#heading-3)\n';
      
      expect(toc).toBe(expected);
    });
    
    it('should respect minimum level', () => {
      const headings = [
        { level: 1, text: 'Heading 1' },
        { level: 2, text: 'Heading 2' },
        { level: 3, text: 'Heading 3' }
      ];
      
      const toc = generateToc(headings, 2);
      const expected = 
        '- [Heading 2](#heading-2)\n' +
        '  - [Heading 3](#heading-3)\n';
      
      expect(toc).toBe(expected);
    });
    
    it('should handle empty headings', () => {
      const toc = generateToc([], 1);
      expect(toc).toBe('');
    });
  });
});
