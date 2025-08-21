import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { FileService } from '../../services/FileService';
import fs from 'fs/promises';
import path from 'path';

// Mock fs/promises
jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock multer
jest.mock('multer', () => {
  const multer = jest.fn(() => ({
    single: jest.fn(),
    array: jest.fn(),
    fields: jest.fn(),
    none: jest.fn(),
    any: jest.fn()
  }));
  
  multer.diskStorage = jest.fn(() => ({}));
  multer.memoryStorage = jest.fn(() => ({}));
  
  return multer;
});

describe('FileService', () => {
  let fileService: FileService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fs methods with default implementations
    mockedFs.access.mockResolvedValue(undefined);
    mockedFs.mkdir.mockResolvedValue(undefined);
    mockedFs.stat.mockResolvedValue({
      size: 1024 * 1024, // 1MB
      isFile: () => true,
      mtime: new Date()
    } as any);
    mockedFs.unlink.mockResolvedValue(undefined);
    mockedFs.rename.mockResolvedValue(undefined);
    mockedFs.readdir.mockResolvedValue([]);
    mockedFs.writeFile.mockResolvedValue(undefined);
    mockedFs.readFile.mockResolvedValue(Buffer.from('test content'));
    mockedFs.appendFile.mockResolvedValue(undefined);
    
    // Mock fs.open for file handle operations
    const mockFileHandle = {
      read: jest.fn().mockResolvedValue({ bytesRead: 4 }),
      close: jest.fn().mockResolvedValue(undefined)
    };
    mockedFs.open.mockResolvedValue(mockFileHandle as any);

    fileService = new FileService();
  });

  describe('constructor', () => {
    it('should create upload directories on initialization', () => {
      expect(mockedFs.access).toHaveBeenCalled();
    });

    it('should create directories if they do not exist', async () => {
      mockedFs.access.mockRejectedValueOnce(new Error('Directory not found'));
      
      new FileService();
      
      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockedFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('uploads/manuscripts'),
        { recursive: true }
      );
    });
  });

  describe('getMulterConfig', () => {
    it('should return multer configuration', () => {
      const config = fileService.getMulterConfig();
      expect(config).toBeDefined();
    });
  });

  describe('getPaymentProofMulterConfig', () => {
    it('should return payment proof multer configuration', () => {
      const config = fileService.getPaymentProofMulterConfig();
      expect(config).toBeDefined();
    });
  });

  describe('validateUploadedFile', () => {
    it('should validate file size', async () => {
      const filePath = '/test/file.pdf';
      
      // Mock file stats with large size
      mockedFs.stat.mockResolvedValueOnce({
        size: 15 * 1024 * 1024, // 15MB (exceeds 10MB limit)
        isFile: () => true,
        mtime: new Date()
      } as any);

      const result = await fileService.validateUploadedFile(filePath);
      
      expect(result).toEqual({
        code: 'FILE_TOO_LARGE',
        message: expect.stringContaining('exceeds maximum allowed size')
      });
    });

    it('should validate PDF header', async () => {
      const filePath = '/test/file.pdf';
      
      // Mock valid PDF header
      const mockFileHandle = {
        read: jest.fn().mockResolvedValue({ bytesRead: 4 }),
        close: jest.fn().mockResolvedValue(undefined)
      };
      mockedFs.open.mockResolvedValueOnce(mockFileHandle as any);
      
      // Mock PDF header buffer
      mockFileHandle.read.mockImplementationOnce((buffer: Buffer) => {
        buffer.write('%PDF', 0, 'ascii');
        return Promise.resolve({ bytesRead: 4 });
      });

      const result = await fileService.validateUploadedFile(filePath);
      
      expect(result).toBeNull();
    });

    it('should reject invalid PDF header', async () => {
      const filePath = '/test/file.pdf';
      
      const mockFileHandle = {
        read: jest.fn().mockResolvedValue({ bytesRead: 4 }),
        close: jest.fn().mockResolvedValue(undefined)
      };
      mockedFs.open.mockResolvedValueOnce(mockFileHandle as any);
      
      // Mock invalid header
      mockFileHandle.read.mockImplementationOnce((buffer: Buffer) => {
        buffer.write('FAKE', 0, 'ascii');
        return Promise.resolve({ bytesRead: 4 });
      });

      const result = await fileService.validateUploadedFile(filePath);
      
      expect(result).toEqual({
        code: 'INVALID_PDF_FORMAT',
        message: 'File is not a valid PDF document'
      });
    });

    it('should handle file validation errors', async () => {
      const filePath = '/test/nonexistent.pdf';
      
      mockedFs.stat.mockRejectedValueOnce(new Error('File not found'));

      const result = await fileService.validateUploadedFile(filePath);
      
      expect(result).toEqual({
        code: 'FILE_VALIDATION_ERROR',
        message: 'Failed to validate uploaded file'
      });
    });
  });

  describe('validateUploadedPaymentProof', () => {
    it('should validate payment proof file size', async () => {
      const filePath = '/test/payment.jpg';
      
      mockedFs.stat.mockResolvedValueOnce({
        size: 6 * 1024 * 1024, // 6MB (exceeds 5MB limit)
        isFile: () => true,
        mtime: new Date()
      } as any);

      const result = await fileService.validateUploadedPaymentProof(filePath);
      
      expect(result).toEqual({
        code: 'FILE_TOO_LARGE',
        message: expect.stringContaining('exceeds maximum allowed size')
      });
    });

    it('should validate JPEG header', async () => {
      const filePath = '/test/payment.jpg';
      
      const mockFileHandle = {
        read: jest.fn().mockResolvedValue({ bytesRead: 8 }),
        close: jest.fn().mockResolvedValue(undefined)
      };
      mockedFs.open.mockResolvedValueOnce(mockFileHandle as any);
      
      // Mock valid JPEG header (FF D8 FF)
      mockFileHandle.read.mockImplementationOnce((buffer: Buffer) => {
        buffer[0] = 0xFF;
        buffer[1] = 0xD8;
        buffer[2] = 0xFF;
        return Promise.resolve({ bytesRead: 8 });
      });

      const result = await fileService.validateUploadedPaymentProof(filePath);
      
      expect(result).toBeNull();
    });

    it('should validate PNG header', async () => {
      const filePath = '/test/payment.png';
      
      const mockFileHandle = {
        read: jest.fn().mockResolvedValue({ bytesRead: 8 }),
        close: jest.fn().mockResolvedValue(undefined)
      };
      mockedFs.open.mockResolvedValueOnce(mockFileHandle as any);
      
      // Mock valid PNG header
      mockFileHandle.read.mockImplementationOnce((buffer: Buffer) => {
        const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        pngSignature.forEach((byte, index) => {
          buffer[index] = byte;
        });
        return Promise.resolve({ bytesRead: 8 });
      });

      const result = await fileService.validateUploadedPaymentProof(filePath);
      
      expect(result).toBeNull();
    });

    it('should reject invalid JPEG header', async () => {
      const filePath = '/test/payment.jpg';
      
      const mockFileHandle = {
        read: jest.fn().mockResolvedValue({ bytesRead: 8 }),
        close: jest.fn().mockResolvedValue(undefined)
      };
      mockedFs.open.mockResolvedValueOnce(mockFileHandle as any);
      
      // Mock invalid JPEG header
      mockFileHandle.read.mockImplementationOnce((buffer: Buffer) => {
        buffer[0] = 0x00;
        buffer[1] = 0x00;
        buffer[2] = 0x00;
        return Promise.resolve({ bytesRead: 8 });
      });

      const result = await fileService.validateUploadedPaymentProof(filePath);
      
      expect(result).toEqual({
        code: 'INVALID_JPEG_FORMAT',
        message: 'File is not a valid JPEG image'
      });
    });
  });

  describe('getFileInfo', () => {
    it('should return file information for existing file', async () => {
      const filePath = '/test/file.pdf';
      
      mockedFs.stat.mockResolvedValueOnce({
        size: 1024,
        isFile: () => true,
        mtime: new Date()
      } as any);

      const result = await fileService.getFileInfo(filePath);
      
      expect(result).toEqual({
        exists: true,
        size: 1024,
        mimetype: 'application/pdf',
        filename: 'file.pdf'
      });
    });

    it('should return exists false for non-existent file', async () => {
      const filePath = '/test/nonexistent.pdf';
      
      mockedFs.stat.mockRejectedValueOnce(new Error('File not found'));

      const result = await fileService.getFileInfo(filePath);
      
      expect(result).toEqual({ exists: false });
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const filePath = '/test/file.pdf';
      
      mockedFs.unlink.mockResolvedValueOnce(undefined);

      const result = await fileService.deleteFile(filePath);
      
      expect(result).toBe(true);
      expect(mockedFs.unlink).toHaveBeenCalledWith(filePath);
    });

    it('should return false if file deletion fails', async () => {
      const filePath = '/test/file.pdf';
      
      mockedFs.unlink.mockRejectedValueOnce(new Error('Permission denied'));

      const result = await fileService.deleteFile(filePath);
      
      expect(result).toBe(false);
    });
  });

  describe('organizeFile', () => {
    it('should organize file into submission directory', async () => {
      const tempPath = '/temp/file.pdf';
      const submissionId = 'sub-123';
      const originalName = 'manuscript.pdf';
      
      // Mock directory creation
      mockedFs.access.mockRejectedValueOnce(new Error('Directory not found'));
      mockedFs.mkdir.mockResolvedValueOnce(undefined);
      mockedFs.rename.mockResolvedValueOnce(undefined);

      const result = await fileService.organizeFile(tempPath, submissionId, originalName);
      
      expect(result).toContain(submissionId);
      expect(result).toContain('manuscript_');
      expect(result).toContain('.pdf');
      expect(mockedFs.mkdir).toHaveBeenCalled();
      expect(mockedFs.rename).toHaveBeenCalledWith(tempPath, result);
    });
  });

  describe('getRelativePath', () => {
    it('should extract relative path from absolute path', () => {
      const absolutePath = '/home/user/project/uploads/manuscripts/file.pdf';
      
      const result = fileService.getRelativePath(absolutePath);
      
      expect(result).toBe('uploads/manuscripts/file.pdf');
    });

    it('should return original path if uploads not found', () => {
      const absolutePath = '/some/other/path/file.pdf';
      
      const result = fileService.getRelativePath(absolutePath);
      
      expect(result).toBe(absolutePath);
    });
  });

  describe('getAbsolutePath', () => {
    it('should return absolute path for relative path', () => {
      const relativePath = 'uploads/manuscripts/file.pdf';
      
      const result = fileService.getAbsolutePath(relativePath);
      
      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toContain(relativePath);
    });

    it('should return same path if already absolute', () => {
      const absolutePath = '/home/user/file.pdf';
      
      const result = fileService.getAbsolutePath(absolutePath);
      
      expect(result).toBe(absolutePath);
    });
  });

  describe('scanForViruses', () => {
    it('should detect empty files', async () => {
      const filePath = '/test/empty.pdf';
      
      mockedFs.stat.mockResolvedValueOnce({
        size: 0,
        isFile: () => true,
        mtime: new Date()
      } as any);

      const result = await fileService.scanForViruses(filePath);
      
      expect(result).toEqual({
        clean: false,
        threat: 'Empty file detected'
      });
    });

    it('should detect suspicious executable signatures', async () => {
      const filePath = '/test/suspicious.pdf';
      
      const mockFileHandle = {
        read: jest.fn().mockResolvedValue({ bytesRead: 2048 }),
        close: jest.fn().mockResolvedValue(undefined)
      };
      mockedFs.open.mockResolvedValueOnce(mockFileHandle as any);
      
      // Mock buffer with MZ header (Windows executable)
      mockFileHandle.read.mockImplementationOnce((buffer: Buffer) => {
        buffer.write('4d5a', 0, 'hex'); // MZ header in hex
        return Promise.resolve({ bytesRead: 2048 });
      });

      const result = await fileService.scanForViruses(filePath);
      
      expect(result).toEqual({
        clean: false,
        threat: 'Suspicious file signature detected'
      });
    });

    it('should detect suspicious script content', async () => {
      const filePath = '/test/script.pdf';
      
      const mockFileHandle = {
        read: jest.fn().mockResolvedValue({ bytesRead: 2048 }),
        close: jest.fn().mockResolvedValue(undefined)
      };
      mockedFs.open.mockResolvedValueOnce(mockFileHandle as any);
      
      // Mock buffer with suspicious script content
      mockFileHandle.read.mockImplementationOnce((buffer: Buffer) => {
        buffer.write('eval(malicious_code)', 0, 'ascii');
        return Promise.resolve({ bytesRead: 2048 });
      });

      const result = await fileService.scanForViruses(filePath);
      
      expect(result).toEqual({
        clean: false,
        threat: 'Suspicious script content detected'
      });
    });

    it('should pass clean files', async () => {
      const filePath = '/test/clean.pdf';
      
      const mockFileHandle = {
        read: jest.fn().mockResolvedValue({ bytesRead: 2048 }),
        close: jest.fn().mockResolvedValue(undefined)
      };
      mockedFs.open.mockResolvedValueOnce(mockFileHandle as any);
      
      // Mock buffer with clean PDF content
      mockFileHandle.read.mockImplementationOnce((buffer: Buffer) => {
        buffer.write('%PDF-1.4\nclean content', 0, 'ascii');
        return Promise.resolve({ bytesRead: 2048 });
      });

      const result = await fileService.scanForViruses(filePath);
      
      expect(result).toEqual({ clean: true });
    });

    it('should handle scan errors', async () => {
      const filePath = '/test/error.pdf';
      
      mockedFs.stat.mockRejectedValueOnce(new Error('File access error'));

      const result = await fileService.scanForViruses(filePath);
      
      expect(result).toEqual({
        clean: false,
        threat: 'Scan failed'
      });
    });
  });

  describe('quarantineFile', () => {
    it('should quarantine suspicious file', async () => {
      const filePath = '/test/suspicious.pdf';
      const reason = 'Virus detected';
      
      mockedFs.rename.mockResolvedValueOnce(undefined);
      mockedFs.appendFile.mockResolvedValueOnce(undefined);

      const quarantinePath = await fileService.quarantineFile(filePath, reason);
      
      expect(quarantinePath).toContain('quarantine');
      expect(quarantinePath).toContain('suspicious.pdf');
      expect(mockedFs.rename).toHaveBeenCalledWith(filePath, quarantinePath);
      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('quarantine.log'),
        expect.stringContaining(reason)
      );
    });
  });

  describe('cleanupTempFiles', () => {
    it('should clean up old temporary files', async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      
      mockedFs.readdir.mockResolvedValueOnce(['temp_old_file.pdf', 'permanent_file.pdf']);
      mockedFs.stat
        .mockResolvedValueOnce({
          isFile: () => true,
          mtime: oldDate
        } as any)
        .mockResolvedValueOnce({
          isFile: () => true,
          mtime: new Date() // Recent file
        } as any);

      await fileService.cleanupTempFiles();
      
      expect(mockedFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('temp_old_file.pdf')
      );
      expect(mockedFs.unlink).not.toHaveBeenCalledWith(
        expect.stringContaining('permanent_file.pdf')
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      mockedFs.readdir.mockRejectedValueOnce(new Error('Permission denied'));

      // Should not throw
      await expect(fileService.cleanupTempFiles()).resolves.toBeUndefined();
    });
  });

  describe('Static Methods', () => {
    describe('savePaymentProof', () => {
      it('should save payment proof file', async () => {
        const mockFile = {
          buffer: Buffer.from('test content'),
          originalname: 'payment.jpg',
          mimetype: 'image/jpeg'
        } as Express.Multer.File;
        
        const filename = 'payment_proof_123.jpg';

        const result = await FileService.savePaymentProof(mockFile, filename);
        
        expect(result).toContain('uploads/payment_proofs');
        expect(result).toContain(filename);
        expect(mockedFs.writeFile).toHaveBeenCalled();
      });
    });

    describe('downloadPaymentProof', () => {
      it('should download payment proof file', async () => {
        const relativePath = 'uploads/payment_proofs/proof.jpg';
        const mockRes = {
          setHeader: jest.fn(),
          send: jest.fn()
        };

        await FileService.downloadPaymentProof(relativePath, mockRes);
        
        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', expect.any(String));
        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment'));
        expect(mockRes.send).toHaveBeenCalled();
      });

      it('should throw error for non-existent file', async () => {
        const relativePath = 'uploads/payment_proofs/nonexistent.jpg';
        const mockRes = {
          setHeader: jest.fn(),
          send: jest.fn()
        };
        
        mockedFs.stat.mockRejectedValueOnce(new Error('File not found'));

        await expect(
          FileService.downloadPaymentProof(relativePath, mockRes)
        ).rejects.toThrow('File not found');
      });
    });
  });
});