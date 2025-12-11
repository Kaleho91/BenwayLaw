import { ApiProperty } from '@nestjs/swagger';

export class AuditLogResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    firmId: string;

    @ApiProperty()
    userId?: string;

    @ApiProperty()
    entityType: string;

    @ApiProperty()
    entityId?: string;

    @ApiProperty({ enum: ['create', 'read', 'update', 'delete'] })
    operation: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    ipAddress?: string;
}

export class AuditLogListResponseDto {
    @ApiProperty({ type: [AuditLogResponseDto] })
    data: AuditLogResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;
}

export class DataSubjectExportDto {
    @ApiProperty()
    exportedAt: Date;

    @ApiProperty()
    dataSubject: {
        type: 'client' | 'user';
        id: string;
        email: string;
    };

    @ApiProperty()
    personalData: {
        profile: Record<string, unknown>;
        auditLog: {
            timestamp: Date;
            operation: string;
            entityType: string;
        }[];
    };
}
