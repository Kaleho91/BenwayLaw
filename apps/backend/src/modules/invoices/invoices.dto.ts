import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsDateString, IsArray, ValidateNested, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceLineItemDto {
    @ApiProperty({ enum: ['time', 'expense', 'flat_fee', 'custom'] })
    @IsEnum(['time', 'expense', 'flat_fee', 'custom'])
    lineType: 'time' | 'expense' | 'flat_fee' | 'custom';

    @ApiProperty({ description: 'Line item description' })
    @IsString()
    description: string;

    @ApiProperty({ description: 'Quantity (hours for time, 1 for expenses)' })
    @IsNumber()
    quantity: number;

    @ApiProperty({ description: 'Rate per unit' })
    @IsNumber()
    rate: number;

    @ApiProperty({ description: 'Line total (quantity * rate)' })
    @IsNumber()
    amount: number;

    @ApiPropertyOptional({ description: 'Related time entry ID' })
    @IsOptional()
    @IsUUID()
    timeEntryId?: string;

    @ApiPropertyOptional({ description: 'Related expense ID' })
    @IsOptional()
    @IsUUID()
    expenseId?: string;
}

export class CreateInvoiceDto {
    @ApiProperty({ description: 'Client ID' })
    @IsUUID()
    clientId: string;

    @ApiPropertyOptional({ description: 'Matter ID (filter time entries from this matter)' })
    @IsOptional()
    @IsUUID()
    matterId?: string;

    @ApiPropertyOptional({ description: 'Invoice date (defaults to today)' })
    @IsOptional()
    @IsDateString()
    invoiceDate?: string;

    @ApiPropertyOptional({ description: 'Due days from invoice date (default 30)' })
    @IsOptional()
    @IsNumber()
    dueDays?: number;

    @ApiPropertyOptional({ description: 'Custom invoice number (auto-generated if not provided)' })
    @IsOptional()
    @IsString()
    invoiceNumber?: string;

    @ApiPropertyOptional({ description: 'Invoice notes' })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({ description: 'Override province for tax calculation' })
    @IsOptional()
    @IsString()
    province?: string;

    @ApiPropertyOptional({ type: [CreateInvoiceLineItemDto], description: 'Manual line items (if not auto-generating from time entries)' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateInvoiceLineItemDto)
    lineItems?: CreateInvoiceLineItemDto[];

    @ApiPropertyOptional({ description: 'Time entry IDs to include (auto-generates line items)' })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    timeEntryIds?: string[];

    @ApiPropertyOptional({ description: 'Expense IDs to include' })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    expenseIds?: string[];
}

export class UpdateInvoiceDto {
    @ApiPropertyOptional({ description: 'Invoice date' })
    @IsOptional()
    @IsDateString()
    invoiceDate?: string;

    @ApiPropertyOptional({ description: 'Due date' })
    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @ApiPropertyOptional({ description: 'Invoice notes' })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({ enum: ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'written_off'] })
    @IsOptional()
    @IsEnum(['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'written_off'])
    status?: 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'written_off';
}

export class InvoiceLineItemResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty({ enum: ['time', 'expense', 'flat_fee', 'custom'] })
    lineType: 'time' | 'expense' | 'flat_fee' | 'custom';

    @ApiProperty()
    description: string;

    @ApiProperty()
    quantity: number;

    @ApiProperty()
    rate: number;

    @ApiProperty()
    amount: number;

    @ApiPropertyOptional()
    timeEntryId?: string;

    @ApiPropertyOptional()
    expenseId?: string;

    @ApiProperty()
    sortOrder: number;
}

export class TaxBreakdownDto {
    @ApiProperty()
    label: string;

    @ApiProperty()
    amount: number;
}

export class InvoiceResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    firmId: string;

    @ApiProperty()
    clientId: string;

    @ApiProperty()
    invoiceNumber: string;

    @ApiProperty()
    invoiceDate: Date;

    @ApiProperty()
    dueDate: Date;

    @ApiProperty({ enum: ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'written_off'] })
    status: 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'written_off';

    @ApiProperty()
    subtotal: number;

    @ApiProperty()
    taxGst: number;

    @ApiProperty()
    taxPst: number;

    @ApiProperty()
    taxHst: number;

    @ApiProperty()
    total: number;

    @ApiProperty()
    amountPaid: number;

    @ApiProperty()
    balanceDue: number;

    @ApiPropertyOptional()
    notes?: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    // Nested data
    @ApiPropertyOptional({ description: 'Client name' })
    clientName?: string;

    @ApiPropertyOptional({ type: [InvoiceLineItemResponseDto] })
    lineItems?: InvoiceLineItemResponseDto[];

    @ApiPropertyOptional({ type: [TaxBreakdownDto], description: 'Tax breakdown for display' })
    taxBreakdown?: TaxBreakdownDto[];
}

export class InvoiceListResponseDto {
    @ApiProperty({ type: [InvoiceResponseDto] })
    data: InvoiceResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiPropertyOptional({ description: 'Sum of all balance due' })
    totalOutstanding?: number;
}

export class RecordPaymentDto {
    @ApiProperty({ description: 'Payment amount' })
    @IsNumber()
    amount: number;

    @ApiProperty({ description: 'Payment date (ISO 8601)' })
    @IsDateString()
    paymentDate: string;

    @ApiProperty({ enum: ['bank_transfer', 'credit_card', 'cheque', 'cash', 'trust_transfer'] })
    @IsEnum(['bank_transfer', 'credit_card', 'cheque', 'cash', 'trust_transfer'])
    paymentMethod: 'bank_transfer' | 'credit_card' | 'cheque' | 'cash' | 'trust_transfer';

    @ApiProperty({ enum: ['external', 'trust'] })
    @IsEnum(['external', 'trust'])
    paymentSource: 'external' | 'trust';

    @ApiPropertyOptional({ description: 'Trust transaction ID if paying from trust' })
    @IsOptional()
    @IsUUID()
    trustTransactionId?: string;

    @ApiPropertyOptional({ description: 'Payment notes' })
    @IsOptional()
    @IsString()
    notes?: string;
}
