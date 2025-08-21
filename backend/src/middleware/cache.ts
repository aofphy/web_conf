import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../services/CacheService.js';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request, res: Response) => boolean;
}

export function cacheMiddleware(options: CacheOptions = {}) {
  const cache = CacheService.getInstance();
  const { 
    ttl = CacheService.TTL.MEDIUM, 
    keyGenerator = (req) => `api:${req.method}:${req.originalUrl}`,
    condition = () => true 
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests by default
    if (req.method !== 'GET') {
      return next();
    }

    // Check condition
    if (!condition(req, res)) {
      return next();
    }

    const cacheKey = keyGenerator(req);
    
    try {
      // Try to get from cache
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        res.set('X-Cache', 'HIT');
        return res.json(cachedData);
      }

      // Store original json method
      const originalJson = res.json.bind(res);
      
      // Override json method to cache the response
      res.json = function(data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(cacheKey, data, ttl).catch(err => 
            console.error('Failed to cache response:', err)
          );
        }
        
        res.set('X-Cache', 'MISS');
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

// Specific cache middleware for different endpoints
export const conferenceCache = cacheMiddleware({
  ttl: CacheService.TTL.LONG,
  keyGenerator: (req) => CacheService.keys.conference(),
});

export const sessionsCache = cacheMiddleware({
  ttl: CacheService.TTL.LONG,
  keyGenerator: (req) => CacheService.keys.sessions(),
});

export const userProfileCache = cacheMiddleware({
  ttl: CacheService.TTL.MEDIUM,
  keyGenerator: (req) => CacheService.keys.userProfile(req.params.userId || req.user?.id),
  condition: (req) => !!req.user, // Only cache for authenticated users
});

export const submissionStatsCache = cacheMiddleware({
  ttl: CacheService.TTL.SHORT,
  keyGenerator: () => CacheService.keys.submissionStats(),
});

export const paymentInstructionsCache = cacheMiddleware({
  ttl: CacheService.TTL.VERY_LONG,
  keyGenerator: () => CacheService.keys.paymentInstructions(),
});

// Cache invalidation helper
export class CacheInvalidator {
  private static cache = CacheService.getInstance();

  static async invalidateUser(userId: string): Promise<void> {
    await this.cache.del(CacheService.keys.userProfile(userId));
    await this.cache.del(CacheService.keys.submissions(userId));
  }

  static async invalidateConference(): Promise<void> {
    await this.cache.del(CacheService.keys.conference());
    await this.cache.del(CacheService.keys.sessions());
  }

  static async invalidateStats(): Promise<void> {
    await this.cache.del(CacheService.keys.submissionStats());
    await this.cache.del(CacheService.keys.userStats());
  }

  static async invalidateAbstractBook(): Promise<void> {
    // Invalidate all abstract book formats
    const formats = ['pdf', 'html', 'docx'];
    const sessionTypes = ['CHE', 'CSE', 'BIO', 'MST', 'PFD'];
    
    for (const format of formats) {
      await this.cache.del(CacheService.keys.abstractBook(format));
      for (const sessionType of sessionTypes) {
        await this.cache.del(CacheService.keys.abstractBook(format, sessionType));
      }
    }
  }
}