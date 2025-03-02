/**
 * Utility functions for the query client
 */

import {
  RequestParams,
  InputEncoding,
  OutputEncoding,
  FormatOptions,
  QueryParams,
  JsonFormatOptions,
  MarkdownFormatOptions,
  HtmlFormatOptions
} from './types';
import { ValidationError } from './errors';

/**
 * Builds a URL with query parameters
 * @param endpoint The API endpoint
 * @param params Query parameters
 * @returns The formatted URL
 */
export function buildUrl(endpoint: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return endpoint;
  }

  const url = new URL(endpoint, 'https://api.plugged.in');
  
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    
    if (typeof value === 'object') {
      url.searchParams.append(key, JSON.stringify(value));
    } else {
      url.searchParams.append(key, String(value));
    }
  });

  // Return just the pathname and search parts of the URL
  return url.pathname + url.search;
}

/**
 * Validates request parameters
 * @param params The parameters to validate
 * @throws ValidationError if parameters are invalid
 */
export function validateParams(params: RequestParams): void {
  if (!params || typeof params !== 'object') {
    throw new ValidationError('Parameters must be an object');
  }

  // Check if query is a valid string when present
  if (params.query !== undefined && params.query !== null) {
    if (typeof params.query !== 'string') {
      throw new ValidationError('Query parameter must be a string');
    }
    
    // Check if query is empty
    if (params.query === '') {
      throw new ValidationError('Query parameter cannot be empty');
    }
  }

  // Check pluggrid format when present
  if (params.pluggrid !== undefined && params.pluggrid !== null) {
    if (typeof params.pluggrid !== 'object') {
      throw new ValidationError('Pluggrid parameter must be an object');
    }
    
    // Validate pluggrid id is present
    if (!params.pluggrid.id) {
      throw new ValidationError('Pluggrid id is required');
    }
  }
  
  // Validate input/output encoding
  if (params.inputEncoding && !isValidInputEncoding(params.inputEncoding)) {
    throw new ValidationError(`Invalid input encoding: ${params.inputEncoding}`);
  }
  
  if (params.outputEncoding && !isValidOutputEncoding(params.outputEncoding)) {
    throw new ValidationError(`Invalid output encoding: ${params.outputEncoding}`);
  }
}

/**
 * Checks if a value is a valid input encoding
 * @param encoding The encoding to check
 * @returns Boolean indicating if encoding is valid
 */
export function isValidInputEncoding(encoding: string): boolean {
  return ['text', 'json', 'image', 'audio', 'video', 'binary'].includes(encoding);
}

/**
 * Checks if a value is a valid output encoding
 * @param encoding The encoding to check
 * @returns Boolean indicating if encoding is valid
 */
export function isValidOutputEncoding(encoding: string): boolean {
  return ['text', 'json', 'audio', 'image', 'markdown', 'html', 'xml'].includes(encoding);
}

/**
 * Safely parses JSON with error handling
 * @param data String data to parse
 * @returns Parsed JSON object or null if parsing failed
 */
export function safeJsonParse(data: string): any {
  try {
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Checks if a value is a plain object
 * @param value The value to check
 * @returns Boolean indicating if value is a plain object
 */
export function isPlainObject(value: any): boolean {
  return value !== null && 
         typeof value === 'object' && 
         !Array.isArray(value) &&
         Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * Check if a value is a Buffer
 * @param value The value to check
 * @returns Boolean indicating if value is a Buffer
 */
export function isBuffer(value: any): boolean {
  return Buffer.isBuffer(value);
}

/**
 * Check if a value is an ArrayBuffer
 * @param value The value to check
 * @returns Boolean indicating if value is an ArrayBuffer
 */
export function isArrayBuffer(value: any): boolean {
  return value instanceof ArrayBuffer;
}

/**
 * Get file extension from MIME type
 * @param mimeType The MIME type
 * @returns File extension (without dot)
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'text/plain': 'txt',
    'application/json': 'json',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'audio/mp3': 'mp3',  // Added this mapping
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'video/mp4': 'mp4',
    'video/mpeg': 'mpeg',
    'application/pdf': 'pdf', // Added PDF support
    'application/octet-stream': 'bin',
    'text/markdown': 'md',
    'text/html': 'html',
    'application/xml': 'xml'
  };
  
  return mimeToExt[mimeType] || 'bin';
}

/**
 * Encodes data for API transmission
 * @param data The data to encode (string, object, Buffer, or ArrayBuffer)
 * @param encoding The input encoding type
 * @param mimeType Optional MIME type for the data
 * @returns Encoded string representation
 */
export function encodeInput(
  data: string | object | Buffer | ArrayBuffer,
  encoding: InputEncoding,
  mimeType?: string
): string {
  // Handle text encoding
  if (encoding === 'text') {
    return String(data);
  }
  
  // Handle JSON encoding
  if (encoding === 'json') {
    return typeof data === 'string' ? data : JSON.stringify(data);
  }
  
  // Handle binary encodings (image, audio, video, binary)
  if (['image', 'audio', 'video', 'binary'].includes(encoding)) {
    // Convert to Buffer if needed
    let buffer: Buffer;
    
    if (isBuffer(data)) {
      buffer = data as Buffer;
    } else if (isArrayBuffer(data)) {
      buffer = Buffer.from(data as ArrayBuffer);
    } else {
      throw new Error(`Invalid data type for ${encoding} encoding. Expected Buffer or ArrayBuffer.`);
    }
    
    // Default MIME types based on encoding
    const defaultMimeTypes: Record<string, string> = {
      'image': 'image/jpeg',
      'audio': 'audio/mpeg',
      'video': 'video/mp4',
      'binary': 'application/octet-stream'
    };
    
    // Use provided MIME type or default based on encoding
    const actualMimeType = mimeType || defaultMimeTypes[encoding] || 'application/octet-stream';
    
    // For binary data, return base64 encoding
    return buffer.toString('base64');
  }
  
  throw new Error(`Unsupported encoding: ${encoding}`);
}

/**
 * Gets the content type for a given input encoding
 * @param encoding The input encoding
 * @param mimeType Optional specific MIME type
 * @returns The content type string
 */
export function getContentType(encoding: InputEncoding, mimeType?: string): string {
  const mimeMap: Record<InputEncoding, string> = {
    'text': 'text/plain',
    'json': 'application/json',
    'image': 'image/jpeg',
    'audio': 'audio/mpeg',
    'video': 'video/mp4',
    'binary': 'application/octet-stream'
  };
  
  return mimeType || mimeMap[encoding];
}

/**
 * Extract headings from markdown text
 * @param markdown The markdown text
 * @returns Array of headings with level and text
 */
export function extractHeadings(markdown: string): Array<{level: number, text: string}> {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: Array<{level: number, text: string}> = [];
  let match;
  
  while ((match = headingRegex.exec(markdown)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim()
    });
  }
  
  return headings;
}

/**
 * Generate a table of contents from headings
 * @param headings Array of headings
 * @param minLevel Minimum heading level to include
 * @returns Markdown formatted table of contents
 */
export function generateToc(headings: Array<{level: number, text: string}>, minLevel: number): string {
  if (headings.length === 0) {
    return '';
  }
  
  let toc = '';
  
  headings.forEach(heading => {
    if (heading.level >= minLevel) {
      const indent = '  '.repeat(heading.level - minLevel);
      const link = heading.text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      
      toc += `${indent}- [${heading.text}](#${link})\n`;
    }
  });
  
  return toc;
}

/**
 * Processes JSON output with formatting options
 * @param data The output data
 * @param options JSON formatting options
 * @returns Formatted JSON output
 */
export function processJsonOutput(data: any, options?: JsonFormatOptions): any {
  // If data is already an object, return it
  if (typeof data === 'object' && data !== null) {
    return data;
  }
  
  // If data is a string, try to parse it as JSON
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (e) {
      throw new ValidationError('Failed to parse response as JSON');
    }
  }
  
  return data;
}

/**
 * Processes Markdown output with formatting options
 * @param data The output data
 * @param options Markdown formatting options
 * @returns Formatted Markdown output
 */
export function processMarkdownOutput(data: any, options?: MarkdownFormatOptions): string {
  const markdown = String(data);
  
  // If TOC is requested, generate it
  if (options?.toc) {
    const headings = extractHeadings(markdown);
    const toc = generateToc(headings, options.headerLevel || 1);
    return toc + '\n\n' + markdown;
  }
  
  return markdown;
}

/**
 * Processes HTML output with formatting options
 * @param data The output data
 * @param options HTML formatting options
 * @returns Formatted HTML output
 */
export function processHtmlOutput(data: any, options?: HtmlFormatOptions): string {
  let html = String(data);
  
  // If full document is requested and doesn't already have HTML tags
  if (options?.fullDocument && !html.includes('<html')) {
    html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Content</title>
</head>
<body${options.className ? ` class="${options.className}"` : ''}>
    ${html}
</body>
</html>`;
  } else if (options?.className && !html.includes('<html')) {
    // If only a class name is requested, wrap in a div
    html = `<div class="${options.className}">${html}</div>`;
  }
  
  return html;
}

/**
 * Processes the output according to the specified encoding
 * @param data The response data
 * @param encoding The output encoding
 * @param formatOptions Optional format-specific options
 * @returns Processed output in the requested format
 */
export function processOutputEncoding(
  data: any,
  encoding: OutputEncoding,
  formatOptions?: FormatOptions
): any {
  switch (encoding) {
    case 'json':
      return processJsonOutput(data, formatOptions?.json);
      
    case 'markdown':
      return processMarkdownOutput(data, formatOptions?.markdown);
      
    case 'html':
      return processHtmlOutput(data, formatOptions?.html);
      
    case 'text':
    default:
      return String(data);
  }
}

/**
 * Creates a FormData object for multipart requests
 * @param data The binary data
 * @param encoding The input encoding type
 * @param params Query parameters including metadata
 * @returns FormData object
 */
export function createFormData(
  data: Buffer | ArrayBuffer,
  encoding: InputEncoding,
  params: QueryParams
): FormData {
  const formData = new FormData();
  
  // Convert ArrayBuffer to Buffer if needed
  const buffer = data instanceof ArrayBuffer ? Buffer.from(data) : data;
  
  // Determine filename and MIME type
  const mimeType = params.metadata?.mimeType || getContentType(encoding);
  const filename = params.metadata?.filename || `file.${getExtensionFromMimeType(mimeType)}`;
  
  // Create a Blob with the correct type
  const blob = new Blob([buffer], { type: mimeType });
  
  // Add the main file
  formData.append('file', blob, filename);
  
  // Add any attachments
  if (params.attachments) {
    params.attachments.forEach((attachment, index) => {
      const attachmentData = attachment.data;
      const attachmentMimeType = attachment.mimeType || getContentType(attachment.type);
      const attachmentFilename = attachment.filename || `attachment-${index}.${getExtensionFromMimeType(attachmentMimeType)}`;
      
      let attachmentBlob: Blob;
      
      if (typeof attachmentData === 'string') {
        attachmentBlob = new Blob([attachmentData], { type: attachmentMimeType });
      } else if (isBuffer(attachmentData) || isArrayBuffer(attachmentData)) {
        const buffer = isArrayBuffer(attachmentData) ? Buffer.from(attachmentData as ArrayBuffer) : attachmentData;
        attachmentBlob = new Blob([buffer], { type: attachmentMimeType });
      } else {
        throw new ValidationError(`Invalid attachment data format for attachment ${index}`);
      }
      
      formData.append(`attachment-${index}`, attachmentBlob, attachmentFilename);
    });
  }
  
  return formData;
}
