import { createClient, RedisClientType } from 'redis';

export class CacheService {
  private static instance: CacheService;
  private client: RedisClientType;
  private isConnected: boolean = false;

  private constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
        lazyConnect: true,
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Redis Client Disconnected');
      this.isConnected = false;
    });
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  public async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        // Continue without cache if Redis is not available
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  public async set(key: string, value: any, ttlSeconds: number = 3600): Promise<boolean> {
    if (!this.isConnected) return false;
    
    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  public async del(key: string): Promise<boolean> {
    if (!this.isConnected) return false;
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  public async exists(key: string): Promise<boolean> {
    if (!this.isConnected) return false;
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  public async flush(): Promise<boolean> {
    if (!this.isConnected) return false;
    
    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  // Cache keys for different data types
  public static keys = {
    conference: (id?: string) => id ? `conference:${id}` : 'conference:info',
    sessions: () => 'conference:sessions',
    userProfile: (userId: string) => `user:profile:${userId}`,
    submissions: (userId: string) => `user:submissions:${userId}`,
    submissionStats: () => 'admin:submission:stats',
    userStats: () => 'admin:user:stats',
    paymentInstructions: () => 'payment:instructions',
    abstractBook: (format: string, sessionType?: string) => 
      `abstract:book:${format}${sessionType ? `:${sessionType}` : ''}`,
  };

  // TTL constants (in seconds)
  public static TTL = {
    SHORT: 300,      // 5 minutes
    MEDIUM: 1800,    // 30 minutes
    LONG: 3600,      // 1 hour
    VERY_LONG: 86400, // 24 hours
  };
}