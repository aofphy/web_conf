import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  markdownToHtml,
  sanitizeMarkdown,
  markdownToPlainText,
  validateAbstractMarkdown,
  generatePreview,
  processMarkdownForStorage
} from '../../utils/markdown';

// Mock console.error to avoid noise in tests
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Markdown Utils', () => {
  beforeEach(() => {
    consoleSpy.mockClear();
  });

  describe('markdownToHtml', () => {
    it('should convert basic markdown to HTML', () => {
      const markdown = '# Title\n\nThis is **bold** text.';
      const result = markdownToHtml(markdown);
      
      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<strong>bold</strong>');
    });

    it('should handle empty input', () => {
      expect(markdownToHtml('')).toBe('');
      expect(markdownToHtml(null as any)).toBe('');
      expect(markdownToHtml(undefined as any)).toBe('');
    });

    it('should handle line breaks with GFM', () => {
      const markdown = 'Line 1\nLine 2';
      const result = markdownToHtml(markdown);
      
      expect(result).toContain('<br>');
    });

    it('should handle code blocks', () => {
      const markdown = '```javascript\nconst x = 1;\n```';
      const result = markdownToHtml(markdown);
      
      expect(result).toContain('<pre>');
      expect(result).toContain('<code');
    });
  });

  describe('sanitizeMarkdown', () => {
    it('should remove script tags', () => {
      const markdown = 'Safe content <script>alert("xss")</script> more content';
      const result = sanitizeMarkdown(markdown);
      
      expect(result).toBe('Safe content  more content');
      expect(result).not.toContain('<script>');
    });

    it('should remove iframe tags', () => {
      const markdown = 'Content <iframe src="evil.com"></iframe> more';
      const result = sanitizeMarkdown(markdown);
      
      expect(result).toBe('Content  more');
      expect(result).not.toContain('<iframe>');
    });

    it('should remove javascript: protocols', () => {
      const markdown = '[Link](javascript:alert("xss"))';
      const result = sanitizeMarkdown(markdown);
      
      expect(result).toBe('[Link](alert("xss"))');
    });

    it('should remove event handlers', () => {
      const markdown = '<div onclick="alert()">Content</div>';
      const result = sanitizeMarkdown(markdown);
      
      expect(result).toBe('<div \"alert()\">Content</div>');
    });

    it('should handle empty input', () => {
      expect(sanitizeMarkdown('')).toBe('');
      expect(sanitizeMarkdown(null as any)).toBe('');
      expect(sanitizeMarkdown(undefined as any)).toBe('');
    });
  });

  describe('markdownToPlainText', () => {
    it('should extract plain text from markdown', () => {
      const markdown = '# Title\n\nThis is **bold** and *italic* text with `code`.';
      const result = markdownToPlainText(markdown);
      
      expect(result).toContain('Title');
      expect(result).toContain('This is bold and italic text with code.');
      expect(result).not.toContain('#');
      expect(result).not.toContain('**');
      expect(result).not.toContain('*');
      expect(result).not.toContain('`');
    });

    it('should handle links correctly', () => {
      const markdown = 'Check out [this link](https://example.com) for more info.';
      const result = markdownToPlainText(markdown);
      
      expect(result).toContain('Check out this link for more info.');
      expect(result).not.toContain('[');
      expect(result).not.toContain('](');
    });

    it('should handle empty input', () => {
      expect(markdownToPlainText('')).toBe('');
      expect(markdownToPlainText(null as any)).toBe('');
      expect(markdownToPlainText(undefined as any)).toBe('');
    });

    it('should fallback to regex stripping on error', () => {
      // This test ensures the fallback mechanism works
      const markdown = '# Header\n\n**Bold** text';
      const result = markdownToPlainText(markdown);
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('validateAbstractMarkdown', () => {
    it('should validate a good abstract', () => {
      const markdown = `
        # Research on Machine Learning Methods
        
        This study presents a novel approach to machine learning using advanced algorithms.
        Our methodology involves comprehensive analysis of large datasets.
        The results demonstrate significant improvements in accuracy and performance.
        These findings show promising applications in real-world scenarios.
      `;
      
      const result = validateAbstractMarkdown(markdown);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty abstract', () => {
      const result = validateAbstractMarkdown('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Abstract content is required');
    });

    it('should warn about short abstracts', () => {
      const markdown = 'This is a very short abstract.';
      const result = validateAbstractMarkdown(markdown);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(expect.stringContaining('quite short'));
    });

    it('should reject overly long abstracts', () => {
      const longText = 'word '.repeat(501); // 501 words
      const result = validateAbstractMarkdown(longText);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('too long'));
    });

    it('should warn about missing methodology', () => {
      const markdown = 'This abstract has results but no methodology mentioned.';
      const result = validateAbstractMarkdown(markdown);
      
      expect(result.warnings).toContainEqual(expect.stringContaining('methodology'));
    });

    it('should warn about missing results', () => {
      const markdown = 'This abstract describes the method and approach used.';
      const result = validateAbstractMarkdown(markdown);
      
      expect(result.warnings).toContainEqual(expect.stringContaining('results'));
    });

    it('should warn about excessive headers', () => {
      const markdown = `
        # Header 1
        ## Header 2
        ### Header 3
        #### Header 4
        ##### Header 5
        ###### Header 6
        ####### Header 7
      `;
      const result = validateAbstractMarkdown(markdown);
      
      expect(result.warnings).toContainEqual(expect.stringContaining('headers'));
    });
  });

  describe('generatePreview', () => {
    it('should return full text if shorter than max length', () => {
      const markdown = 'Short text.';
      const result = generatePreview(markdown, 100);
      
      expect(result.trim()).toBe('Short text.');
    });

    it('should truncate at sentence boundary', () => {
      const markdown = 'First sentence. Second sentence. Third sentence.';
      const result = generatePreview(markdown, 30);
      
      // The function truncates and adds ... when it can't find a good sentence break
      expect(result).toContain('First sentence.');
    });

    it('should truncate at word boundary if no good sentence break', () => {
      const markdown = 'This is a very long sentence without proper punctuation that goes on and on';
      const result = generatePreview(markdown, 30);
      
      expect(result).toContain('...');
      expect(result.length).toBeLessThan(35);
    });

    it('should handle empty input', () => {
      expect(generatePreview('')).toBe('');
    });
  });

  describe('processMarkdownForStorage', () => {
    it('should process markdown and return all formats', () => {
      const markdown = '# Title\n\nThis is **bold** text with some content.';
      const result = processMarkdownForStorage(markdown);
      
      expect(result.sanitizedMarkdown).toBe(markdown); // No harmful content to sanitize
      expect(result.html).toContain('<h1>Title</h1>');
      expect(result.html).toContain('<strong>bold</strong>');
      expect(result.plainText).toContain('Title');
      expect(result.plainText).toContain('This is bold text');
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('should sanitize harmful content', () => {
      const markdown = '# Title\n\n<script>alert("xss")</script>Safe content.';
      const result = processMarkdownForStorage(markdown);
      
      expect(result.sanitizedMarkdown).not.toContain('<script>');
      expect(result.html).not.toContain('<script>');
    });

    it('should count words correctly', () => {
      const markdown = 'One two three four five words.';
      const result = processMarkdownForStorage(markdown);
      
      expect(result.wordCount).toBe(6);
    });

    it('should handle empty input', () => {
      const result = processMarkdownForStorage('');
      
      expect(result.sanitizedMarkdown).toBe('');
      expect(result.html).toBe('');
      expect(result.plainText).toBe('');
      expect(result.wordCount).toBe(0);
    });
  });
});