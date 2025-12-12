import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FirmId } from '../../common/decorators/user.decorator';
import { AuditService } from './audit.service';
import { AuditLogListResponseDto, DataSubjectExportDto } from './compliance.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../clients/client.entity';
import { User } from '../users/user.entity';
import { AuditOperation } from './audit-log.entity';

@ApiTags('Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('compliance')
export class ComplianceController {
    constructor(
        private readonly auditService: AuditService,
        @InjectRepository(Client)
        private readonly clientRepo: Repository<Client>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) { }

    /**
     * Get audit logs for the firm
     */
    @Get('audit-logs')
    @ApiOperation({ summary: 'Get audit logs for the firm (PIPEDA compliance)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'entityType', required: false, type: String })
    @ApiQuery({ name: 'entityId', required: false, type: String })
    @ApiQuery({ name: 'userId', required: false, type: String })
    @ApiQuery({ name: 'operation', required: false, enum: ['create', 'read', 'update', 'delete'] })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiResponse({ status: 200, type: AuditLogListResponseDto })
    async getAuditLogs(
        @FirmId() firmId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('entityType') entityType?: string,
        @Query('entityId') entityId?: string,
        @Query('userId') userId?: string,
        @Query('operation') operation?: AuditOperation,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ): Promise<AuditLogListResponseDto> {
        return this.auditService.findByFirm(firmId, {
            entityType,
            entityId,
            userId,
            operation,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            page: parseInt(page || '1', 10),
            limit: parseInt(limit || '50', 10),
        });
    }

    /**
     * Get audit history for a specific entity
     */
    @Get('audit-logs/entity/:entityType/:entityId')
    @ApiOperation({ summary: 'Get audit history for a specific entity' })
    async getEntityAuditHistory(
        @FirmId() firmId: string,
        @Param('entityType') entityType: string,
        @Param('entityId', ParseUUIDPipe) entityId: string,
    ) {
        return this.auditService.getEntityHistory(firmId, entityType, entityId);
    }

    /**
     * Export client data (PIPEDA data subject access request)
     */
    @Get('data-export/client/:clientId')
    @ApiOperation({ summary: 'Export all data for a client (PIPEDA DSAR)' })
    @ApiResponse({ status: 200, type: DataSubjectExportDto })
    async exportClientData(
        @FirmId() firmId: string,
        @Param('clientId', ParseUUIDPipe) clientId: string,
    ): Promise<DataSubjectExportDto> {
        // Get client profile
        const client = await this.clientRepo.findOne({
            where: { id: clientId, firmId },
            relations: ['matters', 'invoices', 'trustTransactions'],
        });

        if (!client) {
            throw new Error('Client not found');
        }

        // Get audit logs related to this client
        const auditLogs = await this.auditService.getEntityHistory(firmId, 'clients', clientId);

        return {
            exportedAt: new Date(),
            dataSubject: {
                type: 'client',
                id: client.id,
                email: client.email,
            },
            personalData: {
                profile: {
                    name: client.name,
                    email: client.email,
                    phone: client.phone,
                    address: client.address,
                    clientType: client.clientType,
                    createdAt: client.createdAt,
                    matters: client.matters?.map(m => ({
                        id: m.id,
                        name: m.name,
                        matterNumber: m.matterNumber,
                        status: m.status,
                    })),
                    invoices: client.invoices?.map(i => ({
                        id: i.id,
                        invoiceNumber: i.invoiceNumber,
                        status: i.status,
                        total: i.total,
                    })),
                },
                auditLog: auditLogs.map(log => ({
                    timestamp: log.createdAt,
                    operation: log.operation,
                    entityType: log.entityType,
                })),
            },
        };
    }

    /**
     * Export user data (internal staff - PIPEDA/Law 25)
     */
    @Get('data-export/user/:userId')
    @ApiOperation({ summary: 'Export all data for a user (PIPEDA DSAR)' })
    @ApiResponse({ status: 200, type: DataSubjectExportDto })
    async exportUserData(
        @FirmId() firmId: string,
        @Param('userId', ParseUUIDPipe) userId: string,
    ): Promise<DataSubjectExportDto> {
        // Get user profile  
        const user = await this.userRepo.findOne({
            where: { id: userId, firmId },
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Get audit logs related to this user
        const auditLogs = await this.auditService.exportUserData(firmId, userId);

        return {
            exportedAt: new Date(),
            dataSubject: {
                type: 'user',
                id: user.id,
                email: user.email,
            },
            personalData: {
                profile: {
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    createdAt: user.createdAt,
                },
                auditLog: auditLogs.map(log => ({
                    timestamp: log.createdAt,
                    operation: log.operation,
                    entityType: log.entityType,
                })),
            },
        };
    }

    /**
     * PIPEDA compliance summary for the firm
     */
    @Get('pipeda-summary')
    @ApiOperation({ summary: 'Get PIPEDA compliance summary' })
    async getPipedaSummary(@FirmId() firmId: string) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentLogs = await this.auditService.findByFirm(firmId, {
            startDate: thirtyDaysAgo,
            limit: 1,
        });

        // Count clients and users
        const clientCount = await this.clientRepo.count({ where: { firmId } });
        const userCount = await this.userRepo.count({ where: { firmId } });

        return {
            firmId,
            reportGeneratedAt: new Date(),
            dataSubjects: {
                clients: clientCount,
                users: userCount,
            },
            auditLogStats: {
                totalRecords: recentLogs.total,
                periodStart: thirtyDaysAgo,
                periodEnd: new Date(),
            },
            complianceFeatures: {
                auditLogging: true,
                dataSubjectAccessRequest: true,
                consentManagement: false, // Not yet implemented
                dataRetentionPolicy: false, // Not yet implemented
                breachNotification: false, // Not yet implemented
            },
            law25Quebec: {
                privacyDesignated: false, // Requires firm configuration
                privacyPolicyPublished: false,
                incidentManagement: false,
            },
        };
    }
}
