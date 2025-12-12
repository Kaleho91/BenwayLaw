import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsUUID, IsDateString, IsEnum, Min } from 'class-validator';
import { TaxTreatment } from './expense.entity';

export class CreateExpenseDto {
    @ApiProperty({ description: 'Matter ID to record expense against' })
    @IsUUID()
    matterId: string;

    @ApiProperty({ description: 'Date of the expense (ISO 8601)' })
    @IsDateString()
    expenseDate: string;

    @ApiProperty({ description: 'Amount of the expense', minimum: 0 })
    @IsNumber()
    @Min(0)
    amount: number;

    @ApiProperty({ description: 'Description of the expense' })
    @IsString()
    description: string;

    @ApiPropertyOptional({ description: 'Whether this expense is billable', default: true })
    @IsOptional()
    @IsBoolean()
    billable?: boolean;

    @ApiPropertyOptional({
        description: 'Tax treatment for this expense',
        enum: ['taxable', 'exempt', 'zero_rated'],
        default: 'taxable'
    })
    @IsOptional()
    @IsEnum(['taxable', 'exempt', 'zero_rated'])
    taxTreatment?: TaxTreatment;
}

export class UpdateExpenseDto {
    @ApiPropertyOptional({ description: 'Date of the expense (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    expenseDate?: string;

    @ApiPropertyOptional({ description: 'Amount of the expense', minimum: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    amount?: number;

    @ApiPropertyOptional({ description: 'Description of the expense' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Whether this expense is billable' })
    @IsOptional()
    @IsBoolean()
    billable?: boolean;

    @ApiPropertyOptional({
        description: 'Tax treatment for this expense',
        enum: ['taxable', 'exempt', 'zero_rated']
    })
    @IsOptional()
    @IsEnum(['taxable', 'exempt', 'zero_rated'])
    taxTreatment?: TaxTreatment;
}

export class ExpenseResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    firmId: string;

    @ApiProperty()
    matterId: string;

    @ApiProperty()
    expenseDate: Date;

    @ApiProperty()
    amount: number;

    @ApiProperty()
    description: string;

    @ApiProperty()
    billable: boolean;

    @ApiProperty()
    billed: boolean;

    @ApiProperty({ enum: ['taxable', 'exempt', 'zero_rated'] })
    taxTreatment: TaxTreatment;

    @ApiPropertyOptional()
    invoiceId?: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    // Nested info
    @ApiPropertyOptional()
    matterName?: string;

    @ApiPropertyOptional()
    matterNumber?: string;

    @ApiPropertyOptional()
    clientName?: string;
}

export class ExpenseListResponseDto {
    @ApiProperty({ type: [ExpenseResponseDto] })
    data: ExpenseResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiPropertyOptional()
    totalAmount?: number;
}
