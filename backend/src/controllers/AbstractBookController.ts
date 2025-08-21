import { Response } from 'express';
import { AbstractBookService, AbstractBookFilters, AbstractBookTemplate } from '../services/AbstractBookService.js';
import { AuthenticatedRequest } from '../types/index.js';
import { SessionType, PresentationType, SubmissionStatus } from '../types/database.js';
import fs from 'fs/promises';
import path from 'path';

export class AbstractBookController {
  private abstractBookService: AbstractBookService;

  constructor() {
    this.abstractBookService = new AbstractBookService();
  }

  /**
   * Preview abstract book data (without generating files)
   */
  async previewAbstractBook(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Validate user permissions (admin only)
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Admin access required' }
        });
        return;
      }

      // Parse filters from query parameters
      const filters = this.parseFilters(req.query);

      // Collect abstract data
      const abstractBookData = await this.abstractBookService.collectAbstracts(filters);

      res.json({
        success: true,
        data: {
          metadata: abstractBookData.metadata,
          sessionSummary: Object.entries(abstractBookData.sections).map(([sessionType, section]) => ({
            sessionType,
            sessionName: section.name,
            abstractCount: section.abstracts.length
          })),
          totalAbstracts: abstractBookData.metadata.totalAbstracts,
          hasIndexes: !!abstractBookData.indexes
        }
      });

    } catch (error) {
      console.error('Error previewing abstract book:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to preview abstract book' }
      });
    }
  }

  /**
   * Generate abstract book in specified format
   */
  async generateAbstractBook(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Validate user permissions (admin only)
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Admin access required' }
        });
        return;
      }

      const { format = 'html', template: customTemplate, pdfOptions = {} } = req.body;

      // Validate format
      if (!['html', 'pdf', 'docx'].includes(format)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_FORMAT', message: 'Format must be html, pdf, or docx' }
        });
        return;
      }

      // Parse filters from request body
      const filters = this.parseFilters(req.body.filters || {});

      // Collect abstract data
      const abstractBookData = await this.abstractBookService.collectAbstracts(filters);

      if (abstractBookData.metadata.totalAbstracts === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'NO_ABSTRACTS', message: 'No abstracts found matching the specified criteria' }
        });
        return;
      }

      // Get or create template
      let template: AbstractBookTemplate;
      if (customTemplate) {
        template = customTemplate;
      } else {
        template = await this.abstractBookService.createDefaultTemplate();
      }

      // Generate HTML
      const htmlContent = await this.abstractBookService.generateHTML(abstractBookData, template);

      if (format === 'html') {
        // Return HTML directly
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', 'attachment; filename="abstract-book.html"');
        res.send(htmlContent);
        return;
      }

      if (format === 'pdf') {
        // Generate PDF using enhanced method
        const pdfBuffer = await this.abstractBookService.generatePDF(htmlContent, pdfOptions);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="abstract-book.pdf"');
        res.send(pdfBuffer);
        return;
      }

      if (format === 'docx') {
        // Generate DOCX
        const docxBuffer = await this.abstractBookService.generateDOCX(abstractBookData, template);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename="abstract-book.docx"');
        res.send(docxBuffer);
        return;
      }

    } catch (error) {
      console.error('Error generating abstract book:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate abstract book' }
      });
    }
  }

  /**
   * Get default template for customization
   */
  async getDefaultTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Validate user permissions (admin only)
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Admin access required' }
        });
        return;
      }

      const template = await this.abstractBookService.createDefaultTemplate();

      res.json({
        success: true,
        data: template
      });

    } catch (error) {
      console.error('Error getting default template:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get default template' }
      });
    }
  }

  /**
   * Get available filter options
   */
  async getFilterOptions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Validate user permissions (admin only)
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Admin access required' }
        });
        return;
      }

      const sessionTypes: { value: SessionType; label: string }[] = [
        { value: 'CHE', label: 'Computational Chemistry' },
        { value: 'CSE', label: 'High Performance Computing/Computer Science/Engineering' },
        { value: 'BIO', label: 'Computational Biology/Bioinformatics/Biochemistry/Biophysics' },
        { value: 'MST', label: 'Mathematics and Statistics' },
        { value: 'PFD', label: 'Computational Physics/Computational Fluid Dynamics/Solid Mechanics' }
      ];

      const presentationTypes: { value: PresentationType; label: string }[] = [
        { value: 'oral', label: 'Oral Presentation' },
        { value: 'poster', label: 'Poster Presentation' }
      ];

      const statusOptions: { value: SubmissionStatus; label: string }[] = [
        { value: 'submitted', label: 'Submitted' },
        { value: 'under_review', label: 'Under Review' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'rejected', label: 'Rejected' }
      ];

      const formatOptions = [
        { value: 'html', label: 'HTML (Web/Print)' },
        { value: 'pdf', label: 'PDF (Print-ready)' },
        { value: 'docx', label: 'DOCX (Editable Document)' }
      ];

      res.json({
        success: true,
        data: {
          sessionTypes,
          presentationTypes,
          statusOptions,
          formatOptions
        }
      });

    } catch (error) {
      console.error('Error getting filter options:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get filter options' }
      });
    }
  }

  /**
   * Parse filters from request parameters
   */
  private parseFilters(params: any): AbstractBookFilters {
    const filters: AbstractBookFilters = {};

    // Parse session types
    if (params.sessionTypes) {
      if (Array.isArray(params.sessionTypes)) {
        filters.sessionTypes = params.sessionTypes.filter((type: string) => 
          ['CHE', 'CSE', 'BIO', 'MST', 'PFD'].includes(type)
        );
      } else if (typeof params.sessionTypes === 'string') {
        const types = params.sessionTypes.split(',').map((s: string) => s.trim());
        filters.sessionTypes = types.filter((type: string) => 
          ['CHE', 'CSE', 'BIO', 'MST', 'PFD'].includes(type)
        );
      }
    }

    // Parse presentation types
    if (params.presentationTypes) {
      if (Array.isArray(params.presentationTypes)) {
        filters.presentationTypes = params.presentationTypes.filter((type: string) => 
          ['oral', 'poster'].includes(type)
        );
      } else if (typeof params.presentationTypes === 'string') {
        const types = params.presentationTypes.split(',').map((s: string) => s.trim());
        filters.presentationTypes = types.filter((type: string) => 
          ['oral', 'poster'].includes(type)
        );
      }
    }

    // Parse status
    if (params.status && ['submitted', 'under_review', 'accepted', 'rejected'].includes(params.status)) {
      filters.status = params.status;
    }

    // Parse boolean options
    filters.includeKeywords = params.includeKeywords === true || params.includeKeywords === 'true';
    filters.includeAuthors = params.includeAuthors === true || params.includeAuthors === 'true';

    return filters;
  }



  /**
   * Save generated abstract book to file system (for future downloads)
   */
  async saveAbstractBook(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Validate user permissions (admin only)
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Admin access required' }
        });
        return;
      }

      const { format = 'pdf', filename, template: customTemplate, pdfOptions = {} } = req.body;

      // Validate format
      if (!['html', 'pdf', 'docx'].includes(format)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_FORMAT', message: 'Format must be html, pdf, or docx' }
        });
        return;
      }

      // Parse filters
      const filters = this.parseFilters(req.body.filters || {});

      // Collect abstract data
      const abstractBookData = await this.abstractBookService.collectAbstracts(filters);

      if (abstractBookData.metadata.totalAbstracts === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'NO_ABSTRACTS', message: 'No abstracts found matching the specified criteria' }
        });
        return;
      }

      // Get or create template
      let template: AbstractBookTemplate;
      if (customTemplate) {
        template = customTemplate;
      } else {
        template = await this.abstractBookService.createDefaultTemplate();
      }

      // Generate HTML
      const htmlContent = await this.abstractBookService.generateHTML(abstractBookData, template);

      // Create filename if not provided
      const timestamp = new Date().toISOString().split('T')[0];
      const defaultFilename = `abstract-book-${timestamp}`;
      const finalFilename = filename || defaultFilename;

      // Ensure abstract books directory exists
      const abstractBooksDir = path.join(process.cwd(), 'uploads', 'abstract_books');
      await fs.mkdir(abstractBooksDir, { recursive: true });

      let filePath: string;
      let contentType: string;

      if (format === 'html') {
        filePath = path.join(abstractBooksDir, `${finalFilename}.html`);
        await fs.writeFile(filePath, htmlContent, 'utf8');
        contentType = 'text/html';
      } else if (format === 'pdf') {
        // Generate PDF
        const pdfBuffer = await this.abstractBookService.generatePDF(htmlContent, pdfOptions);
        filePath = path.join(abstractBooksDir, `${finalFilename}.pdf`);
        await fs.writeFile(filePath, pdfBuffer);
        contentType = 'application/pdf';
      } else if (format === 'docx') {
        // Generate DOCX
        const docxBuffer = await this.abstractBookService.generateDOCX(abstractBookData, template);
        filePath = path.join(abstractBooksDir, `${finalFilename}.docx`);
        await fs.writeFile(filePath, docxBuffer);
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else {
        throw new Error('Invalid format specified');
      }

      // Get file stats
      const stats = await fs.stat(filePath);
      const relativePath = path.relative(process.cwd(), filePath);

      res.json({
        success: true,
        data: {
          filename: path.basename(filePath),
          path: relativePath,
          size: stats.size,
          format,
          contentType,
          generatedAt: new Date(),
          abstractCount: abstractBookData.metadata.totalAbstracts
        },
        message: 'Abstract book saved successfully'
      });

    } catch (error) {
      console.error('Error saving abstract book:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to save abstract book' }
      });
    }
  }

  /**
   * Download previously saved abstract book
   */
  async downloadAbstractBook(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Validate user permissions (admin only)
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Admin access required' }
        });
        return;
      }

      const { filename } = req.params;

      if (!filename) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_FILENAME', message: 'Filename is required' }
        });
        return;
      }

      // Validate filename to prevent directory traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_FILENAME', message: 'Invalid filename' }
        });
        return;
      }

      const filePath = path.join(process.cwd(), 'uploads', 'abstract_books', filename);

      try {
        await fs.access(filePath);
      } catch {
        res.status(404).json({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'Abstract book file not found' }
        });
        return;
      }

      // Get file stats and determine content type
      const stats = await fs.stat(filePath);
      const ext = path.extname(filename).toLowerCase();
      let contentType: string;
      if (ext === '.pdf') {
        contentType = 'application/pdf';
      } else if (ext === '.docx') {
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else {
        contentType = 'text/html';
      }

      // Set headers for download
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', stats.size.toString());

      // Stream file
      const fileContent = await fs.readFile(filePath);
      res.send(fileContent);

    } catch (error) {
      console.error('Error downloading abstract book:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to download abstract book' }
      });
    }
  }

  /**
   * List saved abstract books
   */
  async listAbstractBooks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Validate user permissions (admin only)
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Admin access required' }
        });
        return;
      }

      const abstractBooksDir = path.join(process.cwd(), 'uploads', 'abstract_books');

      try {
        await fs.access(abstractBooksDir);
      } catch {
        // Directory doesn't exist, return empty list
        res.json({
          success: true,
          data: []
        });
        return;
      }

      const files = await fs.readdir(abstractBooksDir);
      const abstractBooks = [];

      for (const filename of files) {
        if (filename.endsWith('.pdf') || filename.endsWith('.html') || filename.endsWith('.docx')) {
          const filePath = path.join(abstractBooksDir, filename);
          const stats = await fs.stat(filePath);
          const ext = path.extname(filename).toLowerCase();

          let format: string;
          if (ext === '.pdf') format = 'pdf';
          else if (ext === '.docx') format = 'docx';
          else format = 'html';

          abstractBooks.push({
            filename,
            format,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          });
        }
      }

      // Sort by creation date (newest first)
      abstractBooks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      res.json({
        success: true,
        data: abstractBooks
      });

    } catch (error) {
      console.error('Error listing abstract books:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list abstract books' }
      });
    }
  }
}