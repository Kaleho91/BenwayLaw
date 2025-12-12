import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDocumentDto {
    @ApiProperty({ type: 'string', format: 'binary' })
    file: any;

    @ApiPropertyOptional({ description: 'Matter ID' })
    @IsOptional()
    @IsUUID()
    matterId?: string;

    @ApiPropertyOptional({ description: 'Client ID' })
    @IsOptional()
    @IsUUID()
    clientId?: string;

    @ApiPropertyOptional({ description: 'Share with client' })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    sharedWithClient?: boolean;
}

export class DocumentResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    firmId: string;

    @ApiPropertyOptional()
    matterId?: string;

    @ApiPropertyOptional()
    clientId?: string;

    @ApiProperty()
    filename: string;

    @ApiProperty()
    mimeType: string;

    @ApiProperty()
    sizeBytes: number;

    @ApiProperty()
    sharedWithClient: boolean;

    @ApiProperty()
    createdAt: Date;

    @ApiPropertyOptional()
    uploadedByUserName?: string;
}

export class DocumentListResponseDto {
    @ApiProperty({ type: [DocumentResponseDto] })
    data: DocumentResponseDto[];

    @ApiProperty()
    total: number;
}
