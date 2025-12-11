import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsUUID, IsDateString, Min, Max } from 'class-validator';

export class CreateTimeEntryDto {
    @ApiProperty({ description: 'Matter ID to record time against' })
    @IsUUID()
    matterId: string;

    @ApiProperty({ description: 'Date of the time entry (ISO 8601)' })
    @IsDateString()
    entryDate: string;

    @ApiProperty({ description: 'Hours worked (0.1 - 24)', minimum: 0.1, maximum: 24 })
    @IsNumber()
    @Min(0.1)
    @Max(24)
    hours: number;

    @ApiProperty({ description: 'Description of work performed' })
    @IsString()
    description: string;

    @ApiPropertyOptional({ description: 'Override hourly rate (uses user default if not specified)' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    rate?: number;

    @ApiPropertyOptional({ description: 'Whether this time is billable', default: true })
    @IsOptional()
    @IsBoolean()
    billable?: boolean;
}

export class UpdateTimeEntryDto {
    @ApiPropertyOptional({ description: 'Date of the time entry (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    entryDate?: string;

    @ApiPropertyOptional({ description: 'Hours worked (0.1 - 24)', minimum: 0.1, maximum: 24 })
    @IsOptional()
    @IsNumber()
    @Min(0.1)
    @Max(24)
    hours?: number;

    @ApiPropertyOptional({ description: 'Description of work performed' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Hourly rate' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    rate?: number;

    @ApiPropertyOptional({ description: 'Whether this time is billable' })
    @IsOptional()
    @IsBoolean()
    billable?: boolean;
}

export class TimeEntryResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    firmId: string;

    @ApiProperty()
    matterId: string;

    @ApiProperty()
    userId: string;

    @ApiProperty()
    entryDate: Date;

    @ApiProperty()
    hours: number;

    @ApiProperty()
    rate: number;

    @ApiProperty()
    description: string;

    @ApiProperty()
    billable: boolean;

    @ApiProperty()
    billed: boolean;

    @ApiPropertyOptional()
    invoiceId?: string;

    @ApiProperty({ description: 'Calculated amount (hours * rate)' })
    amount: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    // Nested relations
    @ApiPropertyOptional({ description: 'Matter name' })
    matterName?: string;

    @ApiPropertyOptional({ description: 'Matter number' })
    matterNumber?: string;

    @ApiPropertyOptional({ description: 'User full name' })
    userName?: string;

    @ApiPropertyOptional({ description: 'Client name' })
    clientName?: string;
}

export class TimeEntryListResponseDto {
    @ApiProperty({ type: [TimeEntryResponseDto] })
    data: TimeEntryResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiPropertyOptional({ description: 'Total hours in result set' })
    totalHours?: number;

    @ApiPropertyOptional({ description: 'Total amount in result set' })
    totalAmount?: number;
}

export class BulkTimeEntryDto {
    @ApiProperty({ type: [CreateTimeEntryDto], description: 'Array of time entries to create' })
    entries: CreateTimeEntryDto[];
}
