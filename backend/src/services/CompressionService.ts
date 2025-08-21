import { createReadStream, createWriteStream, promises as fs } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip, createGunzip } from 'zlib';
import path from 'path';

export class CompressionService {
  private static readonly COMPRESSION_THRESHOLD = 1024 * 1024; // 1MB
  private static readonly COMPRESSED_EXTENSION = '.gz';

  /**
   * Compress a file if it's larger than the threshold
   */
  static async compressFile(filePath: string): Promise<string> {
    try {
      const stats = await fs.stat(filePath);
      
      // Only compress files larger than threshold
      if (stats.size < this.COMPRESSION_THRESHOLD) {
        return filePath;
      }

      const compressedPath = filePath + this.COMPRESSED_EXTENSION;
      const readStream = createReadStream(filePath);
      const writeStream = createWriteStream(compressedPath);
      const gzipStream = createGzip({ level: 6 }); // Balanced compression

      await pipeline(readStream, gzipStream, writeStream);

      // Verify compression was beneficial
      const compressedStats = await fs.stat(compressedPath);
      if (compressedStats.size >= stats.size * 0.9) {
        // If compression didn't save at least 10%, keep original
        await fs.unlink(compressedPath);
        return filePath;
      }

      // Remove original file and return compressed path
      await fs.unlink(filePath);
      return compressedPath;
    } catch (error) {
      console.error('File compression error:', error);
      return filePath; // Return original path on error
    }
  }

  /**
   * Decompress a file if it's compressed
   */
  static async decompressFile(filePath: string, outputPath?: string): Promise<string> {
    if (!filePath.endsWith(this.COMPRESSED_EXTENSION)) {
      return filePath; // Not compressed
    }

    try {
      const decompressedPath = outputPath || filePath.slice(0, -this.COMPRESSED_EXTENSION.length);
      const readStream = createReadStream(filePath);
      const writeStream = createWriteStream(decompressedPath);
      const gunzipStream = createGunzip();

      await pipeline(readStream, gunzipStream, writeStream);
      return decompressedPath;
    } catch (error) {
      console.error('File decompression error:', error);
      throw new Error('Failed to decompress file');
    }
  }

  /**
   * Check if a file is compressed
   */
  static isCompressed(filePath: string): boolean {
    return filePath.endsWith(this.COMPRESSED_EXTENSION);
  }

  /**
   * Get the original filename from a compressed file
   */
  static getOriginalFilename(compressedPath: string): string {
    if (this.isCompressed(compressedPath)) {
      return path.basename(compressedPath, this.COMPRESSED_EXTENSION);
    }
    return path.basename(compressedPath);
  }

  /**
   * Compress multiple files in a directory
   */
  static async compressDirectory(dirPath: string): Promise<void> {
    try {
      const files = await fs.readdir(dirPath);
      const compressionPromises = files
        .filter(file => !file.endsWith(this.COMPRESSED_EXTENSION))
        .map(file => this.compressFile(path.join(dirPath, file)));

      await Promise.all(compressionPromises);
    } catch (error) {
      console.error('Directory compression error:', error);
    }
  }

  /**
   * Get file size information
   */
  static async getFileSizeInfo(filePath: string): Promise<{
    originalSize: number;
    compressedSize?: number;
    compressionRatio?: number;
  }> {
    try {
      if (this.isCompressed(filePath)) {
        const compressedStats = await fs.stat(filePath);
        return {
          originalSize: 0, // Would need to decompress to get original size
          compressedSize: compressedStats.size,
        };
      } else {
        const stats = await fs.stat(filePath);
        return {
          originalSize: stats.size,
        };
      }
    } catch (error) {
      console.error('Error getting file size info:', error);
      return { originalSize: 0 };
    }
  }

  /**
   * Clean up old compressed files
   */
  static async cleanupOldFiles(dirPath: string, maxAgeHours: number = 24): Promise<void> {
    try {
      const files = await fs.readdir(dirPath);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`Cleaned up old file: ${filePath}`);
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}