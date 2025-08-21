import fs from 'fs/promises';
import path from 'path';

export interface AuditEvent {
  id: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ip: string;
  userAgent?: string;
  requestId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'auth' | 'data' | 'admin' | 'security' | 'system';
}

export class AuditService {
  private static readonly AUDIT_LOG_DIR = 'logs/audit';
  private static readonly MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_LOG_FILES = 10;

  constructor() {
    this.ensureLogDirectory();
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.access(AuditService.AUDIT_LOG_DIR);
    } catch {
      await fs.mkdir(AuditService.AUDIT_LOG_DIR, { recursive: true });
    }
  }

  // Log audit event
  public async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      ...event,
    };

    try {
      // Write to daily log file
      const logFileName = `audit-${new Date().toISOString().split('T')[0]}.log`;
      const logFilePath = path.join(AuditService.AUDIT_LOG_DIR, logFileName);
      
      const logEntry = JSON.stringify(auditEvent) + '\n';
      await fs.appendFile(logFilePath, logEntry);

      // Console log for critical events
      if (auditEvent.severity === 'critical') {
        console.error('CRITICAL AUDIT EVENT:', auditEvent);
      }

      // Rotate logs if necessary
      await this.rotateLogsIfNeeded(logFilePath);
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  // Authentication events
  public async logLogin(userId: string, userEmail: string, ip: string, userAgent?: string, requestId?: string): Promise<void> {
    await this.logEvent({
      userId,
      userEmail,
      action: 'login',
      resource: 'user_session',
      ip,
      userAgent,
      requestId,
      severity: 'low',
      category: 'auth',
      details: { success: true },
    });
  }

  public async logFailedLogin(email: string, ip: string, reason: string, userAgent?: string, requestId?: string): Promise<void> {
    await this.logEvent({
      userEmail: email,
      action: 'login_failed',
      resource: 'user_session',
      ip,
      userAgent,
      requestId,
      severity: 'medium',
      category: 'auth',
      details: { reason, success: false },
    });
  }

  public async logLogout(userId: string, userEmail: string, ip: string, requestId?: string): Promise<void> {
    await this.logEvent({
      userId,
      userEmail,
      action: 'logout',
      resource: 'user_session',
      ip,
      requestId,
      severity: 'low',
      category: 'auth',
    });
  }

  public async logPasswordChange(userId: string, userEmail: string, ip: string, requestId?: string): Promise<void> {
    await this.logEvent({
      userId,
      userEmail,
      action: 'password_change',
      resource: 'user_credentials',
      resourceId: userId,
      ip,
      requestId,
      severity: 'medium',
      category: 'auth',
    });
  }

  // Data events
  public async logSubmissionCreate(userId: string, userEmail: string, submissionId: string, ip: string, requestId?: string): Promise<void> {
    await this.logEvent({
      userId,
      userEmail,
      action: 'create',
      resource: 'submission',
      resourceId: submissionId,
      ip,
      requestId,
      severity: 'low',
      category: 'data',
    });
  }

  public async logSubmissionUpdate(userId: string, userEmail: string, submissionId: string, ip: string, requestId?: string): Promise<void> {
    await this.logEvent({
      userId,
      userEmail,
      action: 'update',
      resource: 'submission',
      resourceId: submissionId,
      ip,
      requestId,
      severity: 'low',
      category: 'data',
    });
  }

  public async logSubmissionDelete(userId: string, userEmail: string, submissionId: string, ip: string, requestId?: string): Promise<void> {
    await this.logEvent({
      userId,
      userEmail,
      action: 'delete',
      resource: 'submission',
      resourceId: submissionId,
      ip,
      requestId,
      severity: 'medium',
      category: 'data',
    });
  }

  // Admin events
  public async logUserRoleChange(adminId: string, adminEmail: string, targetUserId: string, oldRole: string, newRole: string, ip: string, requestId?: string): Promise<void> {
    await this.logEvent({
      userId: adminId,
      userEmail: adminEmail,
      action: 'role_change',
      resource: 'user',
      resourceId: targetUserId,
      ip,
      requestId,
      severity: 'high',
      category: 'admin',
      details: { oldRole, newRole },
    });
  }

  public async logPaymentVerification(adminId: string, adminEmail: string, paymentId: string, status: string, ip: string, requestId?: string): Promise<void> {
    await this.logEvent({
      userId: adminId,
      userEmail: adminEmail,
      action: 'payment_verification',
      resource: 'payment',
      resourceId: paymentId,
      ip,
      requestId,
      severity: 'medium',
      category: 'admin',
      details: { status },
    });
  }

  public async logSystemConfigChange(adminId: string, adminEmail: string, configKey: string, ip: string, requestId?: string): Promise<void> {
    await this.logEvent({
      userId: adminId,
      userEmail: adminEmail,
      action: 'config_change',
      resource: 'system_config',
      resourceId: configKey,
      ip,
      requestId,
      severity: 'high',
      category: 'admin',
    });
  }

  // Security events
  public async logSecurityViolation(violation: string, ip: string, details?: any, userAgent?: string, requestId?: string): Promise<void> {
    await this.logEvent({
      action: 'security_violation',
      resource: 'system',
      ip,
      userAgent,
      requestId,
      severity: 'critical',
      category: 'security',
      details: { violation, ...details },
    });
  }

  public async logBruteForceAttempt(email: string, ip: string, attemptCount: number, requestId?: string): Promise<void> {
    await this.logEvent({
      userEmail: email,
      action: 'brute_force_attempt',
      resource: 'user_session',
      ip,
      requestId,
      severity: 'high',
      category: 'security',
      details: { attemptCount },
    });
  }

  public async logFileUpload(userId: string, userEmail: string, fileName: string, fileSize: number, fileType: string, ip: string, requestId?: string): Promise<void> {
    await this.logEvent({
      userId,
      userEmail,
      action: 'file_upload',
      resource: 'file',
      ip,
      requestId,
      severity: 'low',
      category: 'data',
      details: { fileName, fileSize, fileType },
    });
  }

  // System events
  public async logSystemError(error: string, details?: any, requestId?: string): Promise<void> {
    await this.logEvent({
      action: 'system_error',
      resource: 'system',
      ip: 'system',
      requestId,
      severity: 'high',
      category: 'system',
      details: { error, ...details },
    });
  }

  public async logDatabaseOperation(operation: string, table: string, recordId?: string, userId?: string, ip?: string, requestId?: string): Promise<void> {
    await this.logEvent({
      userId,
      action: operation,
      resource: `database_${table}`,
      resourceId: recordId,
      ip: ip || 'system',
      requestId,
      severity: 'low',
      category: 'data',
    });
  }

  // Query audit logs
  public async getAuditLogs(filters: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    action?: string;
    resource?: string;
    severity?: string;
    category?: string;
    limit?: number;
  } = {}): Promise<AuditEvent[]> {
    const logs: AuditEvent[] = [];
    const { limit = 100 } = filters;

    try {
      const logFiles = await fs.readdir(AuditService.AUDIT_LOG_DIR);
      const auditFiles = logFiles
        .filter(file => file.startsWith('audit-') && file.endsWith('.log'))
        .sort()
        .reverse(); // Most recent first

      for (const file of auditFiles) {
        if (logs.length >= limit) break;

        const filePath = path.join(AuditService.AUDIT_LOG_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        for (const line of lines.reverse()) { // Most recent entries first
          if (logs.length >= limit) break;

          try {
            const event: AuditEvent = JSON.parse(line);
            
            // Apply filters
            if (filters.startDate && event.timestamp < filters.startDate) continue;
            if (filters.endDate && event.timestamp > filters.endDate) continue;
            if (filters.userId && event.userId !== filters.userId) continue;
            if (filters.action && event.action !== filters.action) continue;
            if (filters.resource && event.resource !== filters.resource) continue;
            if (filters.severity && event.severity !== filters.severity) continue;
            if (filters.category && event.category !== filters.category) continue;

            logs.push(event);
          } catch (error) {
            console.error('Failed to parse audit log line:', line, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to read audit logs:', error);
    }

    return logs;
  }

  // Generate unique event ID
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Rotate logs if they get too large
  private async rotateLogsIfNeeded(logFilePath: string): Promise<void> {
    try {
      const stats = await fs.stat(logFilePath);
      
      if (stats.size > AuditService.MAX_LOG_SIZE) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = logFilePath.replace('.log', `_${timestamp}.log`);
        
        await fs.rename(logFilePath, rotatedPath);
        
        // Clean up old log files
        await this.cleanupOldLogs();
      }
    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }

  // Clean up old log files
  private async cleanupOldLogs(): Promise<void> {
    try {
      const logFiles = await fs.readdir(AuditService.AUDIT_LOG_DIR);
      const auditFiles = logFiles
        .filter(file => file.startsWith('audit-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(AuditService.AUDIT_LOG_DIR, file),
        }))
        .sort((a, b) => b.name.localeCompare(a.name)); // Newest first

      // Keep only the most recent files
      if (auditFiles.length > AuditService.MAX_LOG_FILES) {
        const filesToDelete = auditFiles.slice(AuditService.MAX_LOG_FILES);
        
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  // Export audit logs for compliance
  public async exportAuditLogs(startDate: string, endDate: string): Promise<string> {
    const logs = await this.getAuditLogs({
      startDate,
      endDate,
      limit: 10000, // Large limit for export
    });

    const exportData = {
      exportDate: new Date().toISOString(),
      period: { startDate, endDate },
      totalEvents: logs.length,
      events: logs,
    };

    const exportFileName = `audit_export_${startDate}_to_${endDate}.json`;
    const exportPath = path.join(AuditService.AUDIT_LOG_DIR, exportFileName);
    
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    
    return exportPath;
  }
}

// Singleton instance
export const auditService = new AuditService();