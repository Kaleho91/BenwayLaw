import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, FirmId } from '../../common/decorators/user.decorator';
import { AuthUser } from '../auth/auth.service';
import { TrustService } from './trust.service';
import {
    CreateTrustAccountDto,
    UpdateTrustAccountDto,
    TrustAccountResponseDto,
    CreateDepositDto,
    CreateTransferToFeesDto,
    CreateRefundDto,
    TrustTransactionResponseDto,
    TrustTransactionListResponseDto,
    ClientTrustBalanceDto,
    ThreeWayReconciliationDto,
} from './trust.dto';

@ApiTags('trust')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trust')
export class TrustController {
    constructor(private readonly trustService: TrustService) { }

    // ==================== TRUST ACCOUNTS ====================

    @Post('accounts')
    @ApiOperation({ summary: 'Create a new trust account' })
    @ApiResponse({ status: 201, description: 'Trust account created', type: TrustAccountResponseDto })
    async createAccount(
        @FirmId() firmId: string,
        @Body() dto: CreateTrustAccountDto,
    ): Promise<TrustAccountResponseDto> {
        return this.trustService.createAccount(firmId, dto);
    }

    @Get('accounts')
    @ApiOperation({ summary: 'List all trust accounts' })
    @ApiResponse({ status: 200, description: 'List of trust accounts', type: [TrustAccountResponseDto] })
    async findAllAccounts(
        @FirmId() firmId: string,
    ): Promise<TrustAccountResponseDto[]> {
        return this.trustService.findAllAccounts(firmId);
    }

    @Get('accounts/:id')
    @ApiOperation({ summary: 'Get a trust account by ID' })
    @ApiResponse({ status: 200, description: 'Trust account details', type: TrustAccountResponseDto })
    async findOneAccount(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<TrustAccountResponseDto> {
        return this.trustService.findOneAccount(firmId, id);
    }

    @Put('accounts/:id')
    @ApiOperation({ summary: 'Update a trust account' })
    @ApiResponse({ status: 200, description: 'Trust account updated', type: TrustAccountResponseDto })
    async updateAccount(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateTrustAccountDto,
    ): Promise<TrustAccountResponseDto> {
        return this.trustService.updateAccount(firmId, id, dto);
    }

    // ==================== TRUST TRANSACTIONS ====================

    @Post('transactions/deposit')
    @ApiOperation({ summary: 'Record a trust deposit' })
    @ApiResponse({ status: 201, description: 'Deposit recorded', type: TrustTransactionResponseDto })
    async recordDeposit(
        @FirmId() firmId: string,
        @CurrentUser() user: AuthUser,
        @Body() dto: CreateDepositDto,
    ): Promise<TrustTransactionResponseDto> {
        return this.trustService.recordDeposit(firmId, user.id, dto);
    }

    @Post('transactions/transfer-to-fees')
    @ApiOperation({ summary: 'Transfer trust funds to pay invoice (fees)' })
    @ApiResponse({ status: 201, description: 'Transfer recorded', type: TrustTransactionResponseDto })
    @ApiResponse({ status: 400, description: 'Insufficient funds or invalid amount' })
    async recordTransferToFees(
        @FirmId() firmId: string,
        @CurrentUser() user: AuthUser,
        @Body() dto: CreateTransferToFeesDto,
    ): Promise<TrustTransactionResponseDto> {
        return this.trustService.recordTransferToFees(firmId, user.id, dto);
    }

    @Post('transactions/refund')
    @ApiOperation({ summary: 'Record a trust refund to client' })
    @ApiResponse({ status: 201, description: 'Refund recorded', type: TrustTransactionResponseDto })
    @ApiResponse({ status: 400, description: 'Insufficient funds' })
    async recordRefund(
        @FirmId() firmId: string,
        @CurrentUser() user: AuthUser,
        @Body() dto: CreateRefundDto,
    ): Promise<TrustTransactionResponseDto> {
        return this.trustService.recordRefund(firmId, user.id, dto);
    }

    @Get('transactions')
    @ApiOperation({ summary: 'List all trust transactions' })
    @ApiResponse({ status: 200, description: 'List of transactions', type: TrustTransactionListResponseDto })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'accountId', required: false, type: String })
    @ApiQuery({ name: 'clientId', required: false, type: String })
    @ApiQuery({ name: 'matterId', required: false, type: String })
    async findAllTransactions(
        @FirmId() firmId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('accountId') accountId?: string,
        @Query('clientId') clientId?: string,
        @Query('matterId') matterId?: string,
    ): Promise<TrustTransactionListResponseDto> {
        return this.trustService.findAllTransactions(
            firmId,
            parseInt(page || '1', 10),
            parseInt(limit || '50', 10),
            accountId,
            clientId,
            matterId,
        );
    }

    // ==================== BALANCES & RECONCILIATION ====================

    @Get('balances/client/:clientId')
    @ApiOperation({ summary: 'Get trust balance for a client' })
    @ApiResponse({ status: 200, description: 'Client trust balance', type: ClientTrustBalanceDto })
    @ApiQuery({ name: 'accountId', required: false, type: String })
    async getClientBalance(
        @FirmId() firmId: string,
        @Param('clientId', ParseUUIDPipe) clientId: string,
        @Query('accountId') accountId?: string,
    ): Promise<ClientTrustBalanceDto> {
        return this.trustService.getClientTrustBalance(firmId, clientId, accountId);
    }

    @Get('reconciliation/:accountId')
    @ApiOperation({ summary: 'Get three-way reconciliation for a trust account' })
    @ApiResponse({ status: 200, description: 'Reconciliation data', type: ThreeWayReconciliationDto })
    @ApiQuery({ name: 'bankBalance', required: true, type: Number, description: 'Bank statement balance' })
    async getReconciliation(
        @FirmId() firmId: string,
        @Param('accountId', ParseUUIDPipe) accountId: string,
        @Query('bankBalance') bankBalance: string,
    ): Promise<ThreeWayReconciliationDto> {
        return this.trustService.getThreeWayReconciliation(
            firmId,
            accountId,
            parseFloat(bankBalance),
        );
    }
}
