import { Request, Response, NextFunction } from 'express';

export interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
}

export class PerformanceService {
  private static instance: PerformanceService;
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 requests

  private constructor() {}

  public static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  /**
   * Express middleware to track request performance
   */
  public trackRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = process.hrtime.bigint();
      const startMemory = process.memoryUsage();

      // Generate request ID if not exists
      if (!req.requestId) {
        req.requestId = this.generateRequestId();
      }

      // Override res.end to capture metrics
      const originalEnd = res.end.bind(res);
      res.end = function(chunk?: any, encoding?: any) {
        const endTime = process.hrtime.bigint();
        const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        const endMemory = process.memoryUsage();

        const metrics: PerformanceMetrics = {
          requestId: req.requestId,
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          responseTime,
          memoryUsage: {
            rss: endMemory.rss - startMemory.rss,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal,
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            external: endMemory.external - startMemory.external,
            arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
          },
          timestamp: new Date(),
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        };

        PerformanceService.getInstance().recordMetrics(metrics);

        // Log slow requests
        if (responseTime > 1000) { // Requests slower than 1 second
          console.warn(`Slow request detected: ${req.method} ${req.url} - ${responseTime.toFixed(2)}ms`);
        }

        return originalEnd(chunk, encoding);
      };

      next();
    };
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only the last N metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get performance statistics
   */
  public getStatistics(timeWindow: number = 3600000): { // Default: 1 hour
    total: number;
    averageResponseTime: number;
    slowestRequests: PerformanceMetrics[];
    errorRate: number;
    requestsPerMinute: number;
    memoryTrend: {
      average: NodeJS.MemoryUsage;
      peak: NodeJS.MemoryUsage;
    };
  } {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow);
    
    const recentMetrics = this.metrics.filter(m => m.timestamp >= windowStart);
    
    if (recentMetrics.length === 0) {
      return {
        total: 0,
        averageResponseTime: 0,
        slowestRequests: [],
        errorRate: 0,
        requestsPerMinute: 0,
        memoryTrend: {
          average: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 },
          peak: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 },
        },
      };
    }

    const total = recentMetrics.length;
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / total;
    const slowestRequests = recentMetrics
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 10);
    
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorCount / total) * 100;
    
    const requestsPerMinute = (total / (timeWindow / 60000));

    // Memory statistics
    const memoryStats = recentMetrics.reduce(
      (acc, m) => {
        acc.totalRss += Math.abs(m.memoryUsage.rss);
        acc.totalHeapUsed += Math.abs(m.memoryUsage.heapUsed);
        acc.totalHeapTotal += Math.abs(m.memoryUsage.heapTotal);
        acc.totalExternal += Math.abs(m.memoryUsage.external);
        acc.totalArrayBuffers += Math.abs(m.memoryUsage.arrayBuffers);
        
        acc.peakRss = Math.max(acc.peakRss, Math.abs(m.memoryUsage.rss));
        acc.peakHeapUsed = Math.max(acc.peakHeapUsed, Math.abs(m.memoryUsage.heapUsed));
        acc.peakHeapTotal = Math.max(acc.peakHeapTotal, Math.abs(m.memoryUsage.heapTotal));
        acc.peakExternal = Math.max(acc.peakExternal, Math.abs(m.memoryUsage.external));
        acc.peakArrayBuffers = Math.max(acc.peakArrayBuffers, Math.abs(m.memoryUsage.arrayBuffers));
        
        return acc;
      },
      {
        totalRss: 0, totalHeapUsed: 0, totalHeapTotal: 0, totalExternal: 0, totalArrayBuffers: 0,
        peakRss: 0, peakHeapUsed: 0, peakHeapTotal: 0, peakExternal: 0, peakArrayBuffers: 0,
      }
    );

    return {
      total,
      averageResponseTime,
      slowestRequests,
      errorRate,
      requestsPerMinute,
      memoryTrend: {
        average: {
          rss: memoryStats.totalRss / total,
          heapUsed: memoryStats.totalHeapUsed / total,
          heapTotal: memoryStats.totalHeapTotal / total,
          external: memoryStats.totalExternal / total,
          arrayBuffers: memoryStats.totalArrayBuffers / total,
        },
        peak: {
          rss: memoryStats.peakRss,
          heapUsed: memoryStats.peakHeapUsed,
          heapTotal: memoryStats.peakHeapTotal,
          external: memoryStats.peakExternal,
          arrayBuffers: memoryStats.peakArrayBuffers,
        },
      },
    };
  }

  /**
   * Get system health metrics
   */
  public getSystemHealth(): {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    loadAverage: number[];
    freeMemory: number;
    totalMemory: number;
  } {
    const os = require('os');
    
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      loadAverage: os.loadavg(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear old metrics
   */
  public clearOldMetrics(maxAge: number = 86400000): void { // Default: 24 hours
    const cutoff = new Date(Date.now() - maxAge);
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Export metrics for external monitoring systems
   */
  public exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    if (format === 'prometheus') {
      return this.exportPrometheusMetrics();
    }
    
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      statistics: this.getStatistics(),
      systemHealth: this.getSystemHealth(),
      recentMetrics: this.metrics.slice(-100), // Last 100 requests
    }, null, 2);
  }

  /**
   * Export metrics in Prometheus format
   */
  private exportPrometheusMetrics(): string {
    const stats = this.getStatistics();
    const health = this.getSystemHealth();
    
    return `
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total ${stats.total}

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_sum ${stats.averageResponseTime / 1000}
http_request_duration_seconds_count ${stats.total}

# HELP http_requests_per_minute HTTP requests per minute
# TYPE http_requests_per_minute gauge
http_requests_per_minute ${stats.requestsPerMinute}

# HELP http_error_rate HTTP error rate percentage
# TYPE http_error_rate gauge
http_error_rate ${stats.errorRate}

# HELP process_memory_usage_bytes Process memory usage in bytes
# TYPE process_memory_usage_bytes gauge
process_memory_usage_bytes{type="rss"} ${health.memoryUsage.rss}
process_memory_usage_bytes{type="heap_total"} ${health.memoryUsage.heapTotal}
process_memory_usage_bytes{type="heap_used"} ${health.memoryUsage.heapUsed}
process_memory_usage_bytes{type="external"} ${health.memoryUsage.external}

# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${health.uptime}
    `.trim();
  }
}