import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID, IsNumber, IsDateString } from 'class-validator';

export class CreateMatterDto {
    @ApiProperty({ description: 'Client ID this matter belongs to' })
    @IsUUID()
    clientId: string;

    @ApiProperty({ description: 'Unique matter number (e.g., 2024-001)' })
    @IsString()
    matterNumber: string;

    @ApiProperty({ description: 'Matter name/title' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'Matter description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Type of matter (e.g., employment, civil, family)' })
    @IsOptional()
    @IsString()
    matterType?: string;

    @ApiPropertyOptional({ enum: ['active', 'pending', 'closed', 'archived'], default: 'active' })
    @IsOptional()
    @IsEnum(['active', 'pending', 'closed', 'archived'])
    status?: 'active' | 'pending' | 'closed' | 'archived';

    @ApiPropertyOptional({ enum: ['hourly', 'flat_fee', 'contingency', 'mixed'], default: 'hourly' })
    @IsOptional()
    @IsEnum(['hourly', 'flat_fee', 'contingency', 'mixed'])
    billingType?: 'hourly' | 'flat_fee' | 'contingency' | 'mixed';

    @ApiPropertyOptional({ description: 'Flat fee amount (if applicable)' })
    @IsOptional()
    @IsNumber()
    flatFeeAmount?: number;

    @ApiPropertyOptional({ description: 'Responsible lawyer/staff user ID' })
    @IsOptional()
    @IsUUID()
    responsibleUserId?: string;

    @ApiPropertyOptional({ description: 'Matter open date (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    openDate?: string;
}

export class UpdateMatterDto {
    @ApiPropertyOptional({ description: 'Matter name/title' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: 'Matter description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Type of matter' })
    @IsOptional()
    @IsString()
    matterType?: string;

    @ApiPropertyOptional({ enum: ['active', 'pending', 'closed', 'archived'] })
    @IsOptional()
    @IsEnum(['active', 'pending', 'closed', 'archived'])
    status?: 'active' | 'pending' | 'closed' | 'archived';

    @ApiPropertyOptional({ enum: ['hourly', 'flat_fee', 'contingency', 'mixed'] })
    @IsOptional()
    @IsEnum(['hourly', 'flat_fee', 'contingency', 'mixed'])
    billingType?: 'hourly' | 'flat_fee' | 'contingency' | 'mixed';

    @ApiPropertyOptional({ description: 'Flat fee amount (if applicable)' })
    @IsOptional()
    @IsNumber()
    flatFeeAmount?: number;

    @ApiPropertyOptional({ description: 'Responsible lawyer/staff user ID' })
    @IsOptional()
    @IsUUID()
    responsibleUserId?: string;

    @ApiPropertyOptional({ description: 'Matter close date (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    closeDate?: string;
}

export class MatterResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    firmId: string;

    @ApiProperty()
    clientId: string;

    @ApiPropertyOptional()
    responsibleUserId?: string;

    @ApiProperty()
    matterNumber: string;

    @ApiProperty()
    name: string;

    @ApiPropertyOptional()
    description?: string;

    @ApiPropertyOptional()
    matterType?: string;

    @ApiProperty({ enum: ['active', 'pending', 'closed', 'archived'] })
    status: 'active' | 'pending' | 'closed' | 'archived';

    @ApiProperty({ enum: ['hourly', 'flat_fee', 'contingency', 'mixed'] })
    billingType: 'hourly' | 'flat_fee' | 'contingency' | 'mixed';

    @ApiPropertyOptional()
    flatFeeAmount?: number;

    @ApiProperty()
    openDate: Date;

    @ApiPropertyOptional()
    closeDate?: Date;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    // Nested relations (when loaded)
    @ApiPropertyOptional({ description: 'Client name' })
    clientName?: string;

    @ApiPropertyOptional({ description: 'Responsible user name' })
    responsibleUserName?: string;

    // Aggregated data
    @ApiPropertyOptional({ description: 'Total unbilled time in hours' })
    unbilledHours?: number;

    @ApiPropertyOptional({ description: 'Total unbilled amount' })
    unbilledAmount?: number;

    @ApiPropertyOptional({ description: 'Trust balance for this matter' })
    trustBalance?: number;
}

export class MatterListResponseDto {
    @ApiProperty({ type: [MatterResponseDto] })
    data: MatterResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;
}
