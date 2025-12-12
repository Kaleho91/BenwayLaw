import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { Request } from 'express';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditInterceptor.name);

    constructor(private auditService: AuditService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest<Request>();
        const { method } = req as any;

        // Only log state-changing methods or specific critical reads
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            return next.handle().pipe(
                tap({
                    next: async (data) => {
                        // Success case
                        await this.logRequest(req, data, 'success');
                    },
                    error: async (error) => {
                        // Failure case
                        await this.logRequest(req, error, 'failure');
                    },
                }),
            );
        }

        return next.handle();
    }

    private async logRequest(req: any, resultOrError: any, status: 'success' | 'failure') {
        try {
            const user = req.user; // Assumes AuthGuard has populated this
            const firmId = user?.firmId; // Assumes user object has firmId
            const entityType = this.deriveResourceFromUrl(req.url);

            let operation = 'other';
            if (req.method === 'POST') operation = 'create';
            if (req.method === 'PUT' || req.method === 'PATCH') operation = 'update';
            if (req.method === 'DELETE') operation = 'delete';

            await this.auditService.logAction({
                firmId,
                userId: user?.id,
                operation,
                entityType,
                entityId: resultOrError?.id || req.params?.id, // Try to capture ID
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: {
                    path: req.url,
                    status,
                    statusCode: resultOrError?.status || (status === 'success' ? 200 : 500),
                },
            });
        } catch (e) {
            this.logger.error('Failed to write audit log', e);
        }
    }

    private deriveResourceFromUrl(url: string): string {
        // Basic extraction: /api/clients/123 -> Clients
        const parts = url.split('/').filter(p => p);
        // Assuming /api prefix or similar. parts[0] might be 'api', parts[1] might be 'clients'
        // Or just look for the first significant segment
        const resource = parts.find(p => !['api', 'v1'].includes(p)) || 'unknown';
        return resource.charAt(0).toUpperCase() + resource.slice(1);
    }
}
