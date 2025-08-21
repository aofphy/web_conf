import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { Request } from 'express';
import crypto from 'crypto';
import { CompressionService } from './CompressionService.js';

export interface FileUploadResult {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimetype: string;
}

export interface FileValidationError {
  code: string;
  message: string;
}

export class FileService {
  private static readonly UPLOAD_DIR = 'uploads/manuscripts';
  private static readonly PAYMENT_UPLOAD_DIR = 'uploads/payment_proofs';
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_PAYMENT_FILE_SIZE = 5 * 1024 * 1024; // 5MB for payment proofs
  private static readonly ALLOWED_MIME_TYPES = ['application/pdf'];
  private static readonly ALLOWED_EXTENSIONS = ['.pdf'];
  private static readonly PAYMENT_ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];
  private static readonly PAYMENT_ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

  constructor() {
    this.ensureUploadDirectory();
    this.ensurePaymentUploadDirectory();
  }

  // Ensure upload directory exists
  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(FileService.UPLOAD_DIR);
    } catch {
      await fs.mkdir(FileService.UPLOAD_DIR, { recursive: true });
    }
  }

  // Ensure payment upload directory exists
  private async ensurePaymentUploadDirectory(): Promise<void> {
    try {
      await fs.access(FileService.PAYMENT_UPLOAD_DIR);
    } catch {
      await fs.mkdir(FileService.PAYMENT_UPLOAD_DIR, { recursive: true });
    }
  }

  // Configure multer for file uploads
  public getMulterConfig(): multer.Multer {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        await this.ensureUploadDirectory();
        cb(null, FileService.UPLOAD_DIR);
      },
      filename: (req, file, cb) => {
        // Generate unique filename with timestamp and random string
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const extension = path.extname(file.originalname);
        const filename = `manuscript_${timestamp}_${randomString}${extension}`;
        cb(null, filename);
      }
    });

    return multer({
      storage,
      limits: {
        fileSize: FileService.MAX_FILE_SIZE,
        files: 1 // Only allow one file at a time
      },
      fileFilter: (req, file, cb) => {
        const validationError = this.validateFile(file);
        if (validationError) {
          cb(new Error(validationError.message));
          return;
        }
        cb(null, true);
      }
    });
  }

  // Validate uploaded file
  private validateFile(file: Express.Multer.File): FileValidationError | null {
    // Check file extension
    const extension = path.extname(file.originalname).toLowerCase();
    if (!FileService.ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        code: 'INVALID_FILE_TYPE',
        message: 'Only PDF files are allowed'
      };
    }

    // Check MIME type
    if (!FileService.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return {
        code: 'INVALID_MIME_TYPE',
        message: 'Invalid file type. Only PDF files are allowed'
      };
    }

    return null;
  }

  // Additional server-side file validation after upload
  public async validateUploadedFile(filePath: string): Promise<FileValidationError | null> {
    try {
      const stats = await fs.stat(filePath);
      
      // Check file size
      if (stats.size > FileService.MAX_FILE_SIZE) {
        return {
          code: 'FILE_TOO_LARGE',
          message: `File size exceeds maximum allowed size of ${FileService.MAX_FILE_SIZE / (1024 * 1024)}MB`
        };
      }

      // Basic PDF header check
      const buffer = Buffer.alloc(4);
      const fileHandle = await fs.open(filePath, 'r');
      await fileHandle.read(buffer, 0, 4, 0);
      await fileHandle.close();

      const pdfHeader = buffer.toString('ascii');
      if (!pdfHeader.startsWith('%PDF')) {
        return {
          code: 'INVALID_PDF_FORMAT',
          message: 'File is not a valid PDF document'
        };
      }

      return null;
    } catch (error) {
      return {
        code: 'FILE_VALIDATION_ERROR',
        message: 'Failed to validate uploaded file'
      };
    }
  }

  // Get file info
  public async getFileInfo(filePath: string): Promise<{
    exists: boolean;
    size?: number;
    mimetype?: string;
    filename?: string;
    isCompressed?: boolean;
  }> {
    try {
      const stats = await fs.stat(filePath);
      const filename = CompressionService.getOriginalFilename(filePath);
      const isCompressed = CompressionService.isCompressed(filePath);
      const extension = path.extname(filename).toLowerCase();
      
      let mimetype = 'application/octet-stream';
      if (extension === '.pdf') {
        mimetype = 'application/pdf';
      }

      return {
        exists: true,
        size: stats.size,
        mimetype,
        filename,
        isCompressed
      };
    } catch {
      return { exists: false };
    }
  }

  // Delete file
  public async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Move file to organized structure (by submission ID)
  public async organizeFile(tempPath: string, submissionId: string, originalName: string): Promise<string> {
    const submissionDir = path.join(FileService.UPLOAD_DIR, submissionId);
    
    // Ensure submission directory exists
    try {
      await fs.access(submissionDir);
    } catch {
      await fs.mkdir(submissionDir, { recursive: true });
    }

    // Generate organized filename
    const timestamp = Date.now();
    const extension = path.extname(originalName);
    const organizedFilename = `manuscript_${timestamp}${extension}`;
    const organizedPath = path.join(submissionDir, organizedFilename);

    // Move file
    await fs.rename(tempPath, organizedPath);
    
    // Compress file if beneficial
    const compressedPath = await CompressionService.compressFile(organizedPath);
    
    return compressedPath;
  }

  // Get relative path for database storage
  public getRelativePath(absolutePath: string): string {
    const uploadsIndex = absolutePath.indexOf('uploads/');
    if (uploadsIndex !== -1) {
      return absolutePath.substring(uploadsIndex);
    }
    return absolutePath;
  }

  // Get absolute path from relative path
  public getAbsolutePath(relativePath: string): string {
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }
    return path.resolve(relativePath);
  }

  // Enhanced virus scanning and security checks
  public async scanForViruses(filePath: string): Promise<{ clean: boolean; threat?: string }> {
    // This is a placeholder for virus scanning
    // In production, you would integrate with services like:
    // - ClamAV
    // - VirusTotal API
    // - AWS GuardDuty
    // - Azure Defender
    
    try {
      // Basic file size check as a simple heuristic
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        return { clean: false, threat: 'Empty file detected' };
      }

      // Check for suspicious file patterns (enhanced)
      const buffer = Buffer.alloc(2048); // Increased buffer size
      const fileHandle = await fs.open(filePath, 'r');
      const bytesRead = await fileHandle.read(buffer, 0, 2048, 0);
      await fileHandle.close();

      const content = buffer.subarray(0, bytesRead.bytesRead).toString('hex');
      const textContent = buffer.subarray(0, bytesRead.bytesRead).toString('ascii');
      
      // Enhanced check for executable signatures and malicious patterns
      const suspiciousPatterns = [
        '4d5a', // MZ header (Windows executable)
        '7f454c46', // ELF header (Linux executable)
        'cafebabe', // Java class file
        'd0cf11e0', // Microsoft Office compound document (could contain macros)
        '504b0304', // ZIP file header (could contain malicious content)
        '526172211a07', // RAR archive header
        '377abcaf271c', // 7-Zip archive header
        'ffd8ff', // JPEG with potential embedded content
      ];

      for (const pattern of suspiciousPatterns) {
        if (content.toLowerCase().includes(pattern)) {
          return { clean: false, threat: 'Suspicious file signature detected' };
        }
      }

      // Check for suspicious text patterns
      const suspiciousTextPatterns = [
        /eval\s*\(/gi,
        /document\.write/gi,
        /javascript:/gi,
        /<script/gi,
        /cmd\.exe/gi,
        /powershell/gi,
        /\/bin\/sh/gi,
        /\/bin\/bash/gi,
      ];

      for (const pattern of suspiciousTextPatterns) {
        if (pattern.test(textContent)) {
          return { clean: false, threat: 'Suspicious script content detected' };
        }
      }

      // Additional security checks for PDF files
      if (filePath.toLowerCase().endsWith('.pdf')) {
        const pdfSecurityCheck = await this.checkPDFSecurity(buffer.subarray(0, bytesRead.bytesRead));
        if (!pdfSecurityCheck.clean) {
          return pdfSecurityCheck;
        }
      }

      return { clean: true };
    } catch (error) {
      console.error('Virus scan error:', error);
      return { clean: false, threat: 'Scan failed' };
    }
  }

  // Enhanced PDF security checks
  private async checkPDFSecurity(buffer: Buffer): Promise<{ clean: boolean; threat?: string }> {
    const content = buffer.toString('ascii');
    
    // Check for potentially dangerous PDF features
    const dangerousPatterns = [
      /\/JavaScript/gi,
      /\/JS/gi,
      /\/Launch/gi,
      /\/EmbeddedFile/gi,
      /\/XFA/gi, // XML Forms Architecture (can contain scripts)
      /\/RichMedia/gi,
      /\/3D/gi, // 3D content can contain scripts
      /\/Movie/gi,
      /\/Sound/gi,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        return { clean: false, threat: 'PDF contains potentially dangerous features' };
      }
    }

    return { clean: true };
  }

  // File quarantine system
  private static readonly QUARANTINE_DIR = 'uploads/quarantine';

  private async ensureQuarantineDirectory(): Promise<void> {
    try {
      await fs.access(FileService.QUARANTINE_DIR);
    } catch {
      await fs.mkdir(FileService.QUARANTINE_DIR, { recursive: true });
    }
  }

  public async quarantineFile(filePath: string, reason: string): Promise<string> {
    await this.ensureQuarantineDirectory();
    
    const filename = path.basename(filePath);
    const timestamp = Date.now();
    const quarantinePath = path.join(FileService.QUARANTINE_DIR, `${timestamp}_${filename}`);
    
    // Move file to quarantine
    await fs.rename(filePath, quarantinePath);
    
    // Log quarantine action
    const logEntry = {
      timestamp: new Date().toISOString(),
      originalPath: filePath,
      quarantinePath,
      reason,
    };
    
    const logPath = path.join(FileService.QUARANTINE_DIR, 'quarantine.log');
    await fs.appendFile(logPath, JSON.stringify(logEntry) + '\n');
    
    return quarantinePath;
  }

  // Clean up old temporary files
  public async cleanupTempFiles(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const files = await fs.readdir(FileService.UPLOAD_DIR);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(FileService.UPLOAD_DIR, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile() && (now - stats.mtime.getTime()) > maxAge) {
          // Check if file is referenced in database before deleting
          // This would require a database query to check manuscript_path references
          // For now, we'll skip cleanup of potentially referenced files
          if (file.startsWith('temp_')) {
            await this.deleteFile(filePath);
          }
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  // Payment proof file handling methods

  // Configure multer for payment proof uploads
  public getPaymentProofMulterConfig(): multer.Multer {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        await this.ensurePaymentUploadDirectory();
        cb(null, FileService.PAYMENT_UPLOAD_DIR);
      },
      filename: (req, file, cb) => {
        // Generate unique filename with timestamp and random string
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const extension = path.extname(file.originalname);
        const filename = `payment_proof_${timestamp}_${randomString}${extension}`;
        cb(null, filename);
      }
    });

    return multer({
      storage,
      limits: {
        fileSize: FileService.MAX_PAYMENT_FILE_SIZE,
        files: 1 // Only allow one file at a time
      },
      fileFilter: (req, file, cb) => {
        const validationError = this.validatePaymentProofFile(file);
        if (validationError) {
          cb(new Error(validationError.message));
          return;
        }
        cb(null, true);
      }
    });
  }

  // Validate payment proof file
  private validatePaymentProofFile(file: Express.Multer.File): FileValidationError | null {
    // Check file extension
    const extension = path.extname(file.originalname).toLowerCase();
    if (!FileService.PAYMENT_ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        code: 'INVALID_FILE_TYPE',
        message: 'Only PDF, JPEG, and PNG files are allowed for payment proof'
      };
    }

    // Check MIME type
    if (!FileService.PAYMENT_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return {
        code: 'INVALID_MIME_TYPE',
        message: 'Invalid file type. Only PDF, JPEG, and PNG files are allowed'
      };
    }

    return null;
  }

  // Save payment proof file
  public static async savePaymentProof(file: Express.Multer.File, filename: string): Promise<string> {
    const instance = new FileService();
    await instance.ensurePaymentUploadDirectory();
    
    const filePath = path.join(FileService.PAYMENT_UPLOAD_DIR, filename);
    await fs.writeFile(filePath, file.buffer);
    
    return instance.getRelativePath(filePath);
  }

  // Download payment proof file
  public static async downloadPaymentProof(relativePath: string, res: any): Promise<void> {
    const instance = new FileService();
    const absolutePath = instance.getAbsolutePath(relativePath);
    
    const fileInfo = await instance.getFileInfo(absolutePath);
    if (!fileInfo.exists) {
      throw new Error('File not found');
    }

    res.setHeader('Content-Type', fileInfo.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.filename}"`);
    
    const fileStream = await fs.readFile(absolutePath);
    res.send(fileStream);
  }

  // Validate uploaded payment proof file
  public async validateUploadedPaymentProof(filePath: string): Promise<FileValidationError | null> {
    try {
      const stats = await fs.stat(filePath);
      
      // Check file size
      if (stats.size > FileService.MAX_PAYMENT_FILE_SIZE) {
        return {
          code: 'FILE_TOO_LARGE',
          message: `File size exceeds maximum allowed size of ${FileService.MAX_PAYMENT_FILE_SIZE / (1024 * 1024)}MB`
        };
      }

      // Basic file header checks
      const buffer = Buffer.alloc(8);
      const fileHandle = await fs.open(filePath, 'r');
      await fileHandle.read(buffer, 0, 8, 0);
      await fileHandle.close();

      const extension = path.extname(filePath).toLowerCase();
      
      if (extension === '.pdf') {
        const pdfHeader = buffer.toString('ascii', 0, 4);
        if (!pdfHeader.startsWith('%PDF')) {
          return {
            code: 'INVALID_PDF_FORMAT',
            message: 'File is not a valid PDF document'
          };
        }
      } else if (extension === '.jpg' || extension === '.jpeg') {
        // JPEG files start with FF D8 FF
        if (buffer[0] !== 0xFF || buffer[1] !== 0xD8 || buffer[2] !== 0xFF) {
          return {
            code: 'INVALID_JPEG_FORMAT',
            message: 'File is not a valid JPEG image'
          };
        }
      } else if (extension === '.png') {
        // PNG files start with 89 50 4E 47 0D 0A 1A 0A
        const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        for (let i = 0; i < pngSignature.length; i++) {
          if (buffer[i] !== pngSignature[i]) {
            return {
              code: 'INVALID_PNG_FORMAT',
              message: 'File is not a valid PNG image'
            };
          }
        }
      }

      return null;
    } catch (error) {
      return {
        code: 'FILE_VALIDATION_ERROR',
        message: 'Failed to validate uploaded payment proof file'
      };
    }
  }
}