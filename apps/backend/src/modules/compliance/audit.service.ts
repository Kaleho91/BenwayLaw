import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditOperation } from './audit-log.entity';

export interface AuditLogEntry {
    firmId: string;
    userId?: string;
    entityType: string;
    entityId?: string;
    operation: AuditOperation;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLog)
        private readonly auditLogRepo: Repository<AuditLog>,
    ) { }

    /**
     * Create a new audit log entry
     */
    async log(entry: AuditLogEntry): Promise<void> {
        const auditLog = this.auditLogRepo.create({
            firmId: entry.firmId,
            userId: entry.userId,
            entityType: entry.entityType,
            entityId: entry.entityId,
            operation: entry.operation,
            oldValues: entry.oldValues,
            newValues: entry.newValues,
            ipAddress: entry.ipAddress,
            userAgent: entry.userAgent,
        });

        await this.auditLogRepo.save(auditLog);
    }

    /**
     * Query audit logs for a firm
     */
    async findByFirm(
        firmId: string,
        options: {
            entityType?: string;
            entityId?: string;
            userId?: string;
            operation?: AuditOperation;
            startDate?: Date;
            endDate?: Date;
            page?: number;
            limit?: number;
        } = {},
    ) {
        const {
            entityType,
            entityId,
            userId,
            operation,
            startDate,
            endDate,
            page = 1,
            limit = 50,
        } = options;

        const query = this.auditLogRepo
            .createQueryBuilder('log')
            .where('log.firmId = :firmId', { firmId })
            .orderBy('log.createdAt', 'DESC');

        if (entityType) {
            query.andWhere('log.entityType = :entityType', { entityType });
        }

        if (entityId) {
            query.andWhere('log.entityId = :entityId', { entityId });
        }

        if (userId) {
            query.andWhere('log.userId = :userId', { userId });
        }

        if (operation) {
            query.andWhere('log.operation = :operation', { operation });
        }

        if (startDate && endDate) {
            query.andWhere('log.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
        } else if (startDate) {
            query.andWhere('log.createdAt >= :startDate', { startDate });
        } else if (endDate) {
            query.andWhere('log.createdAt <= :endDate', { endDate });
        }

        const [data, total] = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
        };
    }

    /**
     * Get audit trail for a specific entity
     */
    async getEntityHistory(firmId: string, entityType: string, entityId: string) {
        return this.auditLogRepo.find({
            where: { firmId, entityType, entityId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Export all data for a user (PIPEDA/GDPR data subject access)
     */
    async exportUserData(firmId: string, userId: string) {
        const logs = await this.auditLogRepo.find({
            where: { firmId, userId },
            order: { createdAt: 'DESC' },
        });

        return logs.map(log => ({
            timestamp: log.createdAt,
            operation: log.operation,
            entityType: log.entityType,
            entityId: log.entityId,
            ipAddress: log.ipAddress,
        }));
    }
}
