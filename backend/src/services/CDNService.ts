import path from 'path';
import { promises as fs } from 'fs';

export interface CDNConfig {
  enabled: boolean;
  baseUrl?: string;
  accessKey?: string;
  secretKey?: string;
  bucket?: string;
  region?: string;
}

export class CDNService {
  private static instance: CDNService;
  private config: CDNConfig;

  private constructor() {
    this.config = {
      enabled: process.env.CDN_ENABLED === 'true',
      baseUrl: process.env.CDN_BASE_URL,
      accessKey: process.env.CDN_ACCESS_KEY,
      secretKey: process.env.CDN_SECRET_KEY,
      bucket: process.env.CDN_BUCKET,
      region: process.env.CDN_REGION || 'us-east-1',
    };
  }

  public static getInstance(): CDNService {
    if (!CDNService.instance) {
      CDNService.instance = new CDNService();
    }
    return CDNService.instance;
  }

  /**
   * Get the URL for a file, either from CDN or local storage
   */
  public getFileUrl(relativePath: string): string {
    if (this.config.enabled && this.config.baseUrl) {
      return `${this.config.baseUrl}/${relativePath}`;
    }
    
    // Return local URL
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    return `${baseUrl}/files/${relativePath}`;
  }

  /**
   * Upload file to CDN (placeholder for actual CDN implementation)
   */
  public async uploadFile(localPath: string, remotePath: string): Promise<string> {
    if (!this.config.enabled) {
      return localPath; // Return local path if CDN is disabled
    }

    try {
      // This is a placeholder for actual CDN upload implementation
      // In production, you would integrate with services like:
      // - AWS S3
      // - Google Cloud Storage
      // - Azure Blob Storage
      // - Cloudflare R2
      // - DigitalOcean Spaces

      console.log(`CDN Upload: ${localPath} -> ${remotePath}`);
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return this.getFileUrl(remotePath);
    } catch (error) {
      console.error('CDN upload failed:', error);
      return localPath; // Fallback to local path
    }
  }

  /**
   * Delete file from CDN
   */
  public async deleteFile(remotePath: string): Promise<boolean> {
    if (!this.config.enabled) {
      return true; // Nothing to delete if CDN is disabled
    }

    try {
      // Placeholder for actual CDN deletion
      console.log(`CDN Delete: ${remotePath}`);
      return true;
    } catch (error) {
      console.error('CDN deletion failed:', error);
      return false;
    }
  }

  /**
   * Generate optimized image URLs with transformations
   */
  public getOptimizedImageUrl(relativePath: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}): string {
    const baseUrl = this.getFileUrl(relativePath);
    
    if (!this.config.enabled) {
      return baseUrl; // No optimization for local files
    }

    // Build transformation parameters
    const params = new URLSearchParams();
    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());
    if (options.quality) params.set('q', options.quality.toString());
    if (options.format) params.set('f', options.format);

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * Preload critical assets to CDN
   */
  public async preloadAssets(assetPaths: string[]): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const uploadPromises = assetPaths.map(async (assetPath) => {
      try {
        const stats = await fs.stat(assetPath);
        if (stats.isFile()) {
          const relativePath = path.relative(process.cwd(), assetPath);
          await this.uploadFile(assetPath, relativePath);
        }
      } catch (error) {
        console.error(`Failed to preload asset ${assetPath}:`, error);
      }
    });

    await Promise.all(uploadPromises);
  }

  /**
   * Generate cache-busting URLs
   */
  public getCacheBustedUrl(relativePath: string): string {
    const baseUrl = this.getFileUrl(relativePath);
    const timestamp = Date.now();
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}v=${timestamp}`;
  }

  /**
   * Check if CDN is available and configured
   */
  public isAvailable(): boolean {
    return this.config.enabled && !!this.config.baseUrl;
  }

  /**
   * Get CDN configuration status
   */
  public getStatus(): {
    enabled: boolean;
    configured: boolean;
    baseUrl?: string;
  } {
    return {
      enabled: this.config.enabled,
      configured: !!(this.config.baseUrl && this.config.accessKey),
      baseUrl: this.config.baseUrl,
    };
  }

  /**
   * Sync local files to CDN
   */
  public async syncDirectory(localDir: string, remotePrefix: string = ''): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      const files = await this.getFilesRecursively(localDir);
      
      for (const file of files) {
        const relativePath = path.relative(localDir, file);
        const remotePath = remotePrefix ? `${remotePrefix}/${relativePath}` : relativePath;
        await this.uploadFile(file, remotePath);
      }
    } catch (error) {
      console.error('Directory sync failed:', error);
    }
  }

  /**
   * Get all files in directory recursively
   */
  private async getFilesRecursively(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getFilesRecursively(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
    
    return files;
  }
}