import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AuditOperation } from './audit-log.entity';

/**
 * Interceptor that automatically logs audit events for API operations
 * Apply to controllers that need audit logging
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(private readonly auditService: AuditService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest();
        const method = request.method;
        const user = request.user;
        const path = request.route?.path || request.url;

        // Determine operation type based on HTTP method
        const operationMap: Record<string, AuditOperation> = {
            GET: 'read',
            POST: 'create',
            PUT: 'update',
            PATCH: 'update',
            DELETE: 'delete',
        };

        const operation = operationMap[method] || 'read';

        // Skip GET requests for most endpoints to reduce noise
        // Only log reads for sensitive endpoints
        if (method === 'GET' && !this.isSensitiveEndpoint(path)) {
            return next.handle();
        }

        // Extract entity info from path and params
        const entityType = this.extractEntityType(path);
        const entityId = request.params?.id;

        return next.handle().pipe(
            tap({
                next: (response: { id?: string }) => {
                    // Log successful operations
                    if (user?.firmId) {
                        this.auditService.log({
                            firmId: user.firmId,
                            userId: user.userId || user.sub,
                            entityType,
                            entityId: entityId || response?.id,
                            operation,
                            newValues: method !== 'GET' ? this.sanitizeBody(request.body) : undefined,
                            ipAddress: this.getClientIp(request),
                            userAgent: request.headers['user-agent'],
                        }).catch(err => console.error('Audit log error:', err));
                    }
                },
                error: () => {
                    // Don't log failed operations
                },
            }),
        );
    }

    private isSensitiveEndpoint(path: string): boolean {
        const sensitivePatterns = [
            '/trust',
            '/invoices',
            '/payments',
            '/portal',
            '/auth',
        ];
        return sensitivePatterns.some(p => path.includes(p));
    }

    private extractEntityType(path: string): string {
        // Extract entity type from path like /api/clients/:id
        const match = path.match(/\/api\/([a-z-]+)/);
        return match ? match[1].replace(/-/g, '_') : 'unknown';
    }

    private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
        if (!body) return body;

        // Remove sensitive fields
        const sanitized = { ...body };
        const sensitiveFields = ['password', 'portalPasswordHash', 'token', 'secret'];

        for (const field of sensitiveFields) {
            if (field in sanitized) {
                sanitized[field] = '[REDACTED]';
            }
        }

        return sanitized;
    }

    private getClientIp(request: { ip?: string; headers?: Record<string, string> }): string {
        return (
            request.headers?.['x-forwarded-for']?.split(',')[0] ||
            request.ip ||
            'unknown'
        );
    }
}
