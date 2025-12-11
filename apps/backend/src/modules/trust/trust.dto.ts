import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsUUID, IsDateString, Min } from 'class-validator';

// Trust Account DTOs
export class CreateTrustAccountDto {
    @ApiProperty({ description: 'Trust account name' })
    @IsString()
    accountName: string;

    @ApiPropertyOptional({ description: 'Bank name' })
    @IsOptional()
    @IsString()
    bankName?: string;

    @ApiPropertyOptional({ description: 'Last 4 digits of account number' })
    @IsOptional()
    @IsString()
    accountNumberLast4?: string;

    @ApiPropertyOptional({ description: 'Currency code (default CAD)', default: 'CAD' })
    @IsOptional()
    @IsString()
    currency?: string;
}

export class UpdateTrustAccountDto {
    @ApiPropertyOptional({ description: 'Trust account name' })
    @IsOptional()
    @IsString()
    accountName?: string;

    @ApiPropertyOptional({ description: 'Bank name' })
    @IsOptional()
    @IsString()
    bankName?: string;
}

export class TrustAccountResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    firmId: string;

    @ApiProperty()
    accountName: string;

    @ApiPropertyOptional()
    bankName?: string;

    @ApiPropertyOptional()
    accountNumberLast4?: string;

    @ApiProperty()
    currency: string;

    @ApiProperty({ description: 'Current total balance in the account' })
    currentBalance: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

// Trust Transaction DTOs
export class CreateDepositDto {
    @ApiProperty({ description: 'Trust account ID' })
    @IsUUID()
    trustAccountId: string;

    @ApiProperty({ description: 'Client ID' })
    @IsUUID()
    clientId: string;

    @ApiPropertyOptional({ description: 'Matter ID (optional)' })
    @IsOptional()
    @IsUUID()
    matterId?: string;

    @ApiProperty({ description: 'Deposit amount (must be positive)' })
    @IsNumber()
    @Min(0.01)
    amount: number;

    @ApiProperty({ description: 'Transaction date (ISO 8601)' })
    @IsDateString()
    transactionDate: string;

    @ApiPropertyOptional({ description: 'Description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Reference number (e.g., cheque number)' })
    @IsOptional()
    @IsString()
    referenceNumber?: string;
}

export class CreateTransferToFeesDto {
    @ApiProperty({ description: 'Trust account ID' })
    @IsUUID()
    trustAccountId: string;

    @ApiProperty({ description: 'Client ID' })
    @IsUUID()
    clientId: string;

    @ApiPropertyOptional({ description: 'Matter ID (optional)' })
    @IsOptional()
    @IsUUID()
    matterId?: string;

    @ApiProperty({ description: 'Transfer amount (must be positive)' })
    @IsNumber()
    @Min(0.01)
    amount: number;

    @ApiProperty({ description: 'Transaction date (ISO 8601)' })
    @IsDateString()
    transactionDate: string;

    @ApiProperty({ description: 'Invoice ID being paid' })
    @IsUUID()
    invoiceId: string;

    @ApiPropertyOptional({ description: 'Description' })
    @IsOptional()
    @IsString()
    description?: string;
}

export class CreateRefundDto {
    @ApiProperty({ description: 'Trust account ID' })
    @IsUUID()
    trustAccountId: string;

    @ApiProperty({ description: 'Client ID' })
    @IsUUID()
    clientId: string;

    @ApiPropertyOptional({ description: 'Matter ID (optional)' })
    @IsOptional()
    @IsUUID()
    matterId?: string;

    @ApiProperty({ description: 'Refund amount (must be positive)' })
    @IsNumber()
    @Min(0.01)
    amount: number;

    @ApiProperty({ description: 'Transaction date (ISO 8601)' })
    @IsDateString()
    transactionDate: string;

    @ApiPropertyOptional({ description: 'Description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Reference number' })
    @IsOptional()
    @IsString()
    referenceNumber?: string;
}

export class TrustTransactionResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    firmId: string;

    @ApiProperty()
    trustAccountId: string;

    @ApiPropertyOptional()
    matterId?: string;

    @ApiProperty()
    clientId: string;

    @ApiProperty({ enum: ['deposit', 'transfer_to_fees', 'refund', 'interest', 'bank_charge'] })
    transactionType: 'deposit' | 'transfer_to_fees' | 'refund' | 'interest' | 'bank_charge';

    @ApiProperty()
    amount: number;

    @ApiProperty({ description: 'Client trust balance after this transaction' })
    balanceAfter: number;

    @ApiPropertyOptional()
    description?: string;

    @ApiPropertyOptional()
    referenceNumber?: string;

    @ApiPropertyOptional()
    relatedInvoiceId?: string;

    @ApiProperty()
    transactionDate: Date;

    @ApiPropertyOptional()
    createdByUserId?: string;

    @ApiProperty()
    createdAt: Date;

    // Nested data
    @ApiPropertyOptional()
    clientName?: string;

    @ApiPropertyOptional()
    matterName?: string;

    @ApiPropertyOptional()
    accountName?: string;
}

export class TrustTransactionListResponseDto {
    @ApiProperty({ type: [TrustTransactionResponseDto] })
    data: TrustTransactionResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;
}

export class ClientTrustBalanceDto {
    @ApiProperty()
    clientId: string;

    @ApiProperty()
    clientName: string;

    @ApiProperty({ description: 'Total trust balance for this client' })
    balance: number;

    @ApiPropertyOptional({ description: 'Balance broken down by matter' })
    matterBalances?: {
        matterId: string;
        matterName: string;
        matterNumber: string;
        balance: number;
    }[];
}

export class ThreeWayReconciliationDto {
    @ApiProperty({ description: 'Trust account ID' })
    trustAccountId: string;

    @ApiProperty({ description: 'Account name' })
    accountName: string;

    @ApiProperty({ description: 'Bank statement balance (entered by user)' })
    bankBalance: number;

    @ApiProperty({ description: 'Calculated balance from transactions' })
    ledgerBalance: number;

    @ApiProperty({ description: 'Sum of all client trust balances' })
    clientTotalBalance: number;

    @ApiProperty({ description: 'Whether reconciliation is balanced' })
    isBalanced: boolean;

    @ApiProperty({ description: 'Difference if not balanced' })
    difference: number;

    @ApiProperty({ type: [ClientTrustBalanceDto], description: 'Breakdown by client' })
    clientBalances: ClientTrustBalanceDto[];
}
