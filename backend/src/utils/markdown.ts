import { marked } from 'marked';
import { JSDOM } from 'jsdom';

// Configure marked options for consistent rendering
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
});

/**
 * Convert markdown text to HTML (server-side)
 */
export const markdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  
  try {
    return marked(markdown);
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    return markdown; // Return original text if conversion fails
  }
};

/**
 * Sanitize markdown text by removing potentially harmful content
 */
export const sanitizeMarkdown = (markdown: string): string => {
  if (!markdown) return '';
  
  // Remove script tags and other potentially harmful content
  return markdown
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

/**
 * Extract plain text from markdown (server-side using JSDOM)
 */
export const markdownToPlainText = (markdown: string): string => {
  if (!markdown) return '';
  
  try {
    // Convert to HTML first, then strip tags using JSDOM
    const html = markdownToHtml(markdown);
    const dom = new JSDOM(html);
    return dom.window.document.body.textContent || '';
  } catch (error) {
    console.error('Error extracting plain text from markdown:', error);
    // Fallback: simple regex-based stripping
    return markdown
      .replace(/#+\s/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();
  }
};

/**
 * Validate markdown content for academic abstracts
 */
export const validateAbstractMarkdown = (markdown: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!markdown || markdown.trim().length === 0) {
    errors.push('Abstract content is required');
    return { isValid: false, errors, warnings };
  }
  
  const plainText = markdownToPlainText(markdown);
  const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
  
  // Check word count (typical abstract limits)
  if (wordCount < 50) {
    warnings.push('Abstract is quite short (less than 50 words). Consider adding more detail.');
  } else if (wordCount > 500) {
    errors.push('Abstract is too long (over 500 words). Please shorten it.');
  } else if (wordCount > 350) {
    warnings.push('Abstract is getting long (over 350 words). Consider shortening if possible.');
  }
  
  // Check for common academic abstract sections
  const lowerText = plainText.toLowerCase();
  const hasMethodology = /\b(method|approach|technique|procedure|analysis|experiment)\b/.test(lowerText);
  const hasResults = /\b(result|finding|outcome|conclusion|demonstrate|show)\b/.test(lowerText);
  
  if (!hasMethodology) {
    warnings.push('Consider including information about your methodology or approach.');
  }
  
  if (!hasResults) {
    warnings.push('Consider including key results or findings.');
  }
  
  // Check for excessive formatting
  const headerCount = (markdown.match(/^#+\s/gm) || []).length;
  if (headerCount > 5) {
    warnings.push('Consider reducing the number of headers for better readability.');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Generate a preview excerpt from markdown
 */
export const generatePreview = (markdown: string, maxLength: number = 200): string => {
  const plainText = markdownToPlainText(markdown);
  
  if (plainText.length <= maxLength) {
    return plainText;
  }
  
  // Find the last complete sentence within the limit
  const truncated = plainText.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf('.');
  
  if (lastSentence > maxLength * 0.7) {
    return truncated.substring(0, lastSentence + 1);
  }
  
  // If no good sentence break, truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.substring(0, lastSpace) + '...';
};

/**
 * Process markdown for storage (sanitize and generate HTML)
 */
export const processMarkdownForStorage = (markdown: string): {
  sanitizedMarkdown: string;
  html: string;
  plainText: string;
  wordCount: number;
} => {
  const sanitizedMarkdown = sanitizeMarkdown(markdown);
  const html = markdownToHtml(sanitizedMarkdown);
  const plainText = markdownToPlainText(sanitizedMarkdown);
  const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
  
  return {
    sanitizedMarkdown,
    html,
    plainText,
    wordCount
  };
};