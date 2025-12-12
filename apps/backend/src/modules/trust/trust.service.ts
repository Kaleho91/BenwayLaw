import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, DataSource } from 'typeorm';
import { TrustAccount } from './trust-account.entity';
import { TrustTransaction, TrustTransactionType } from './trust-transaction.entity';
import { Client } from '../clients/client.entity';
import { Matter } from '../matters/matter.entity';
import { Invoice } from '../invoices/invoice.entity';
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

@Injectable()
export class TrustService {
    constructor(
        @InjectRepository(TrustAccount)
        private readonly accountRepo: Repository<TrustAccount>,
        @InjectRepository(TrustTransaction)
        private readonly transactionRepo: Repository<TrustTransaction>,
        @InjectRepository(Client)
        private readonly clientRepo: Repository<Client>,
        @InjectRepository(Matter)
        private readonly matterRepo: Repository<Matter>,
        private readonly dataSource: DataSource,
    ) { }

    // ==================== TRUST ACCOUNT MANAGEMENT ====================

    /**
     * Create a new trust account
     */
    async createAccount(firmId: string, dto: CreateTrustAccountDto): Promise<TrustAccountResponseDto> {
        const account = this.accountRepo.create({
            firmId,
            accountName: dto.accountName,
            bankName: dto.bankName,
            accountNumberLast4: dto.accountNumberLast4,
            currency: dto.currency || 'CAD',
            currentBalance: 0,
        });

        await this.accountRepo.save(account);
        return this.toAccountResponse(account);
    }

    /**
     * Get all trust accounts for a firm
     */
    async findAllAccounts(firmId: string): Promise<TrustAccountResponseDto[]> {
        const accounts = await this.accountRepo.find({
            where: { firmId },
            order: { accountName: 'ASC' },
        });

        return accounts.map(a => this.toAccountResponse(a));
    }

    /**
     * Get a single trust account
     */
    async findOneAccount(firmId: string, accountId: string): Promise<TrustAccountResponseDto> {
        const account = await this.accountRepo.findOne({
            where: { id: accountId, firmId },
        });

        if (!account) {
            throw new NotFoundException('Trust account not found');
        }

        return this.toAccountResponse(account);
    }

    /**
     * Update a trust account
     */
    async updateAccount(
        firmId: string,
        accountId: string,
        dto: UpdateTrustAccountDto,
    ): Promise<TrustAccountResponseDto> {
        const account = await this.accountRepo.findOne({
            where: { id: accountId, firmId },
        });

        if (!account) {
            throw new NotFoundException('Trust account not found');
        }

        if (dto.accountName !== undefined) account.accountName = dto.accountName;
        if (dto.bankName !== undefined) account.bankName = dto.bankName;

        await this.accountRepo.save(account);
        return this.toAccountResponse(account);
    }

    // ==================== TRUST TRANSACTIONS ====================

    /**
     * Record a trust deposit
     */
    async recordDeposit(
        firmId: string,
        userId: string,
        dto: CreateDepositDto,
    ): Promise<TrustTransactionResponseDto> {
        return this.dataSource.transaction(async (manager: EntityManager) => {
            // Verify account, client, and optionally matter belong to firm
            await this.validateTransaction(firmId, dto.trustAccountId, dto.clientId, dto.matterId);

            // Get current client balance in this account
            const currentBalance = await this.getClientBalance(
                firmId,
                dto.trustAccountId,
                dto.clientId,
                manager,
            );

            const newBalance = currentBalance + dto.amount;

            // Create transaction
            const transaction = manager.create(TrustTransaction, {
                firmId,
                trustAccountId: dto.trustAccountId,
                clientId: dto.clientId,
                matterId: dto.matterId,
                transactionType: 'deposit' as TrustTransactionType,
                amount: dto.amount,
                balanceAfter: newBalance,
                description: dto.description || 'Trust deposit',
                referenceNumber: dto.referenceNumber,
                transactionDate: new Date(dto.transactionDate),
                createdByUserId: userId,
            });
            await manager.save(transaction);

            // Update account total balance
            await this.updateAccountBalance(dto.trustAccountId, dto.amount, 'add', manager);

            return this.toTransactionResponse(transaction);
        });
    }

    /**
     * Transfer funds from trust to pay fees (invoice)
     * This is the most critical compliance operation
     */
    async recordTransferToFees(
        firmId: string,
        userId: string,
        dto: CreateTransferToFeesDto,
    ): Promise<TrustTransactionResponseDto> {
        return this.dataSource.transaction(async (manager: EntityManager) => {
            // Validate transaction participants
            await this.validateTransaction(firmId, dto.trustAccountId, dto.clientId, dto.matterId);

            // Verify invoice exists and belongs to this client
            const invoice = await manager.findOne(Invoice, {
                where: { id: dto.invoiceId, firmId, clientId: dto.clientId },
            });
            if (!invoice) {
                throw new NotFoundException('Invoice not found or does not belong to this client');
            }

            // Get current client balance
            const currentBalance = await this.getClientBalance(
                firmId,
                dto.trustAccountId,
                dto.clientId,
                manager,
            );

            // **CRITICAL: Prevent negative trust balance**
            if (dto.amount > currentBalance) {
                throw new BadRequestException(
                    `Insufficient trust funds. Client balance: $${currentBalance.toFixed(2)}, ` +
                    `Transfer amount: $${dto.amount.toFixed(2)}`,
                );
            }

            // Verify amount doesn't exceed invoice balance
            if (dto.amount > Number(invoice.balanceDue)) {
                throw new BadRequestException(
                    `Transfer amount exceeds invoice balance due of $${invoice.balanceDue}`,
                );
            }

            const newBalance = currentBalance - dto.amount;

            // Create transaction
            const transaction = manager.create(TrustTransaction, {
                firmId,
                trustAccountId: dto.trustAccountId,
                clientId: dto.clientId,
                matterId: dto.matterId,
                transactionType: 'transfer_to_fees' as TrustTransactionType,
                amount: dto.amount,
                balanceAfter: newBalance,
                description: dto.description || `Payment for Invoice ${invoice.invoiceNumber}`,
                relatedInvoiceId: dto.invoiceId,
                transactionDate: new Date(dto.transactionDate),
                createdByUserId: userId,
            });
            await manager.save(transaction);

            // Update account total balance
            await this.updateAccountBalance(dto.trustAccountId, dto.amount, 'subtract', manager);

            // Update invoice payment status
            invoice.amountPaid = Number(invoice.amountPaid) + dto.amount;
            invoice.balanceDue = Number(invoice.total) - Number(invoice.amountPaid);
            if (invoice.balanceDue <= 0) {
                invoice.status = 'paid';
            } else {
                invoice.status = 'partial';
            }
            await manager.save(invoice);

            return this.toTransactionResponse(transaction);
        });
    }

    /**
     * Record a trust refund to client
     */
    async recordRefund(
        firmId: string,
        userId: string,
        dto: CreateRefundDto,
    ): Promise<TrustTransactionResponseDto> {
        return this.dataSource.transaction(async (manager: EntityManager) => {
            await this.validateTransaction(firmId, dto.trustAccountId, dto.clientId, dto.matterId);

            const currentBalance = await this.getClientBalance(
                firmId,
                dto.trustAccountId,
                dto.clientId,
                manager,
            );

            // Prevent negative balance
            if (dto.amount > currentBalance) {
                throw new BadRequestException(
                    `Insufficient trust funds for refund. Client balance: $${currentBalance.toFixed(2)}`,
                );
            }

            const newBalance = currentBalance - dto.amount;

            const transaction = manager.create(TrustTransaction, {
                firmId,
                trustAccountId: dto.trustAccountId,
                clientId: dto.clientId,
                matterId: dto.matterId,
                transactionType: 'refund' as TrustTransactionType,
                amount: dto.amount,
                balanceAfter: newBalance,
                description: dto.description || 'Trust refund to client',
                referenceNumber: dto.referenceNumber,
                transactionDate: new Date(dto.transactionDate),
                createdByUserId: userId,
            });
            await manager.save(transaction);

            await this.updateAccountBalance(dto.trustAccountId, dto.amount, 'subtract', manager);

            return this.toTransactionResponse(transaction);
        });
    }

    /**
     * Get all transactions for a trust account
     */
    async findAllTransactions(
        firmId: string,
        page: number = 1,
        limit: number = 50,
        accountId?: string,
        clientId?: string,
        matterId?: string,
    ): Promise<TrustTransactionListResponseDto> {
        const query = this.transactionRepo
            .createQueryBuilder('tx')
            .leftJoinAndSelect('tx.client', 'client')
            .leftJoinAndSelect('tx.matter', 'matter')
            .leftJoinAndSelect('tx.trustAccount', 'account')
            .where('tx.firmId = :firmId', { firmId })
            .orderBy('tx.transactionDate', 'DESC')
            .addOrderBy('tx.createdAt', 'DESC');

        if (accountId) {
            query.andWhere('tx.trustAccountId = :accountId', { accountId });
        }

        if (clientId) {
            query.andWhere('tx.clientId = :clientId', { clientId });
        }

        if (matterId) {
            query.andWhere('tx.matterId = :matterId', { matterId });
        }

        const total = await query.getCount();
        const offset = (page - 1) * limit;

        const transactions = await query
            .skip(offset)
            .take(limit)
            .getMany();

        return {
            data: transactions.map(tx => this.toTransactionResponse(
                tx,
                tx.client?.name,
                tx.matter?.name,
                tx.trustAccount?.accountName,
            )),
            total,
            page,
            limit,
        };
    }

    // ==================== BALANCE & RECONCILIATION ====================

    /**
     * Get trust balance for a specific client (per account)
     */
    async getClientTrustBalance(
        firmId: string,
        clientId: string,
        accountId?: string,
    ): Promise<ClientTrustBalanceDto> {
        const client = await this.clientRepo.findOne({
            where: { id: clientId, firmId },
        });

        if (!client) {
            throw new NotFoundException('Client not found');
        }

        // Get total balance across all accounts (or specific account)
        const balanceQuery = this.transactionRepo
            .createQueryBuilder('tx')
            .select('SUM(CASE WHEN tx.transactionType = \'deposit\' OR tx.transactionType = \'interest\' THEN tx.amount ELSE -tx.amount END)', 'balance')
            .where('tx.firmId = :firmId', { firmId })
            .andWhere('tx.clientId = :clientId', { clientId });

        if (accountId) {
            balanceQuery.andWhere('tx.trustAccountId = :accountId', { accountId });
        }

        const balanceResult = await balanceQuery.getRawOne();
        const balance = parseFloat(balanceResult?.balance || '0');

        // Get balance by matter
        const matterBalances = await this.transactionRepo
            .createQueryBuilder('tx')
            .leftJoin('tx.matter', 'matter')
            .select('tx.matterId', 'matterId')
            .addSelect('matter.name', 'matterName')
            .addSelect('matter.matterNumber', 'matterNumber')
            .addSelect('SUM(CASE WHEN tx.transactionType = \'deposit\' OR tx.transactionType = \'interest\' THEN tx.amount ELSE -tx.amount END)', 'balance')
            .where('tx.firmId = :firmId', { firmId })
            .andWhere('tx.clientId = :clientId', { clientId })
            .andWhere('tx.matterId IS NOT NULL')
            .groupBy('tx.matterId')
            .addGroupBy('matter.name')
            .addGroupBy('matter.matterNumber')
            .getRawMany();

        return {
            clientId,
            clientName: client.name,
            balance,
            matterBalances: matterBalances.map(mb => ({
                matterId: mb.matterId,
                matterName: mb.matterName,
                matterNumber: mb.matterNumber,
                balance: parseFloat(mb.balance || '0'),
            })),
        };
    }

    /**
     * Get three-way reconciliation data for a trust account
     * This is required by law societies for compliance
     */
    async getThreeWayReconciliation(
        firmId: string,
        accountId: string,
        bankBalance: number,
    ): Promise<ThreeWayReconciliationDto> {
        const account = await this.accountRepo.findOne({
            where: { id: accountId, firmId },
        });

        if (!account) {
            throw new NotFoundException('Trust account not found');
        }

        // Get ledger balance (sum of all transactions)
        const ledgerResult = await this.transactionRepo
            .createQueryBuilder('tx')
            .select('SUM(CASE WHEN tx.transactionType = \'deposit\' OR tx.transactionType = \'interest\' THEN tx.amount ELSE -tx.amount END)', 'balance')
            .where('tx.firmId = :firmId', { firmId })
            .andWhere('tx.trustAccountId = :accountId', { accountId })
            .getRawOne();

        const ledgerBalance = parseFloat(ledgerResult?.balance || '0');

        // Get client balances
        const clientBalances = await this.transactionRepo
            .createQueryBuilder('tx')
            .leftJoin('tx.client', 'client')
            .select('tx.clientId', 'clientId')
            .addSelect('client.name', 'clientName')
            .addSelect('SUM(CASE WHEN tx.transactionType = \'deposit\' OR tx.transactionType = \'interest\' THEN tx.amount ELSE -tx.amount END)', 'balance')
            .where('tx.firmId = :firmId', { firmId })
            .andWhere('tx.trustAccountId = :accountId', { accountId })
            .groupBy('tx.clientId')
            .addGroupBy('client.name')
            .getRawMany();

        const clientTotalBalance = clientBalances.reduce(
            (sum, cb) => sum + parseFloat(cb.balance || '0'),
            0,
        );

        // Check if balanced (all three should match)
        const round = (n: number) => Math.round(n * 100) / 100;
        const isBalanced =
            round(bankBalance) === round(ledgerBalance) &&
            round(ledgerBalance) === round(clientTotalBalance);

        const difference = round(
            Math.max(
                Math.abs(bankBalance - ledgerBalance),
                Math.abs(ledgerBalance - clientTotalBalance),
                Math.abs(bankBalance - clientTotalBalance),
            ),
        );

        return {
            trustAccountId: accountId,
            accountName: account.accountName,
            bankBalance: round(bankBalance),
            ledgerBalance: round(ledgerBalance),
            clientTotalBalance: round(clientTotalBalance),
            isBalanced,
            difference: isBalanced ? 0 : difference,
            clientBalances: clientBalances.map(cb => ({
                clientId: cb.clientId,
                clientName: cb.clientName,
                balance: parseFloat(cb.balance || '0'),
            })),
        };
    }

    // ==================== PRIVATE HELPERS ====================

    /**
     * Validate that account, client, and matter belong to the firm
     */
    private async validateTransaction(
        firmId: string,
        accountId: string,
        clientId: string,
        matterId?: string,
    ): Promise<void> {
        const account = await this.accountRepo.findOne({
            where: { id: accountId, firmId },
        });
        if (!account) {
            throw new NotFoundException('Trust account not found');
        }

        const client = await this.clientRepo.findOne({
            where: { id: clientId, firmId },
        });
        if (!client) {
            throw new NotFoundException('Client not found');
        }

        if (matterId) {
            const matter = await this.matterRepo.findOne({
                where: { id: matterId, firmId, clientId },
            });
            if (!matter) {
                throw new NotFoundException('Matter not found or does not belong to this client');
            }
        }
    }

    /**
     * Get current client balance in a specific trust account
     */
    private async getClientBalance(
        firmId: string,
        accountId: string,
        clientId: string,
        manager?: EntityManager,
    ): Promise<number> {
        const repo = manager?.getRepository(TrustTransaction) || this.transactionRepo;

        const result = await repo
            .createQueryBuilder('tx')
            .select('SUM(CASE WHEN tx.transactionType = \'deposit\' OR tx.transactionType = \'interest\' THEN tx.amount ELSE -tx.amount END)', 'balance')
            .where('tx.firmId = :firmId', { firmId })
            .andWhere('tx.trustAccountId = :accountId', { accountId })
            .andWhere('tx.clientId = :clientId', { clientId })
            .getRawOne();

        return parseFloat(result?.balance || '0');
    }

    /**
     * Update the total balance on the trust account
     */
    private async updateAccountBalance(
        accountId: string,
        amount: number,
        operation: 'add' | 'subtract',
        manager: EntityManager,
    ): Promise<void> {
        const account = await manager.findOne(TrustAccount, { where: { id: accountId } });
        if (account) {
            if (operation === 'add') {
                account.currentBalance = Number(account.currentBalance) + amount;
            } else {
                account.currentBalance = Number(account.currentBalance) - amount;
            }
            await manager.save(account);
        }
    }

    private toAccountResponse(account: TrustAccount): TrustAccountResponseDto {
        return {
            id: account.id,
            firmId: account.firmId,
            accountName: account.accountName,
            bankName: account.bankName,
            accountNumberLast4: account.accountNumberLast4,
            currency: account.currency,
            currentBalance: Number(account.currentBalance),
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
        };
    }

    private toTransactionResponse(
        tx: TrustTransaction,
        clientName?: string,
        matterName?: string,
        accountName?: string,
    ): TrustTransactionResponseDto {
        return {
            id: tx.id,
            firmId: tx.firmId,
            trustAccountId: tx.trustAccountId,
            matterId: tx.matterId,
            clientId: tx.clientId,
            transactionType: tx.transactionType,
            amount: Number(tx.amount),
            balanceAfter: Number(tx.balanceAfter),
            description: tx.description,
            referenceNumber: tx.referenceNumber,
            relatedInvoiceId: tx.relatedInvoiceId,
            transactionDate: tx.transactionDate,
            createdByUserId: tx.createdByUserId,
            createdAt: tx.createdAt,
            clientName,
            matterName,
            accountName,
        };
    }
}
