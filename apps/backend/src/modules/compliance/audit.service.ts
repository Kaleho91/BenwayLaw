import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AuditLog, AuditOperation } from './audit-log.entity';

export interface AuditLogQueryOptions {
    page?: number;
    limit?: number;
    entityType?: string;
    entityId?: string;
    userId?: string;
    operation?: AuditOperation;
    startDate?: Date;
    endDate?: Date;
}

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLog)
        private auditLogRepository: Repository<AuditLog>,
    ) { }

    async logAction(data: {
        firmId?: string;
        userId?: string;
        operation: string;
        entityType: string;
        entityId?: string;
        metadata?: Record<string, any>;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<AuditLog> {
        const log = this.auditLogRepository.create(data);
        return this.auditLogRepository.save(log);
    }

    async findByFirm(firmId: string, options: AuditLogQueryOptions) {
        const page = options.page || 1;
        const limit = options.limit || 50;
        const skip = (page - 1) * limit;

        const where: any = { firmId };

        if (options.entityType) where.entityType = options.entityType;
        if (options.entityId) where.entityId = options.entityId;
        if (options.userId) where.userId = options.userId;
        if (options.operation) where.operation = options.operation;

        // Date Filtering
        if (options.startDate && options.endDate) {
            where.createdAt = Between(options.startDate, options.endDate);
        } else if (options.startDate) {
            where.createdAt = MoreThanOrEqual(options.startDate);
        } else if (options.endDate) {
            where.createdAt = LessThanOrEqual(options.endDate);
        }

        const [data, total] = await this.auditLogRepository.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            take: limit,
            skip,
        });

        return { data, total, page, limit };
    }

    async getEntityHistory(firmId: string, entityType: string, entityId: string): Promise<AuditLog[]> {
        return this.auditLogRepository.find({
            where: { firmId, entityType, entityId },
            order: { createdAt: 'DESC' },
        });
    }

    async exportUserData(firmId: string, userId: string): Promise<AuditLog[]> {
        return this.auditLogRepository.find({
            where: { firmId, userId },
            order: { createdAt: 'DESC' },
        });
    }
}
