import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Invoice, InvoiceStatus } from './invoice.entity';
import { InvoiceLineItem } from './invoice-line-item.entity';
import { Payment } from './payment.entity';
import { Client } from '../clients/client.entity';
import { Firm } from '../firms/firm.entity';
import { TimeEntry } from '../time-entries/time-entry.entity';
import { Expense } from '../expenses/expense.entity';
import {
    CreateInvoiceDto,
    UpdateInvoiceDto,
    InvoiceResponseDto,
    InvoiceListResponseDto,
    RecordPaymentDto,
    TaxBreakdownDto,
} from './invoices.dto';

// Canadian tax calculation types
type CanadianProvince = 'ON' | 'BC' | 'AB' | 'QC' | 'MB' | 'SK' | 'NS' | 'NB' | 'NL' | 'PE' | 'NT' | 'NU' | 'YT';

interface TaxRates {
    gst: number;
    pst: number;
    hst: number;
    qst: number;
}

const TAX_RATES: Record<CanadianProvince, TaxRates> = {
    ON: { gst: 0, pst: 0, hst: 0.13, qst: 0 },
    NB: { gst: 0, pst: 0, hst: 0.15, qst: 0 },
    NL: { gst: 0, pst: 0, hst: 0.15, qst: 0 },
    NS: { gst: 0, pst: 0, hst: 0.15, qst: 0 },
    PE: { gst: 0, pst: 0, hst: 0.15, qst: 0 },
    BC: { gst: 0.05, pst: 0.07, hst: 0, qst: 0 },
    MB: { gst: 0.05, pst: 0.07, hst: 0, qst: 0 },
    SK: { gst: 0.05, pst: 0.06, hst: 0, qst: 0 },
    QC: { gst: 0.05, pst: 0, hst: 0, qst: 0.09975 },
    AB: { gst: 0.05, pst: 0, hst: 0, qst: 0 },
    NT: { gst: 0.05, pst: 0, hst: 0, qst: 0 },
    NU: { gst: 0.05, pst: 0, hst: 0, qst: 0 },
    YT: { gst: 0.05, pst: 0, hst: 0, qst: 0 },
};

@Injectable()
export class InvoicesService {
    constructor(
        @InjectRepository(Invoice)
        private readonly invoiceRepo: Repository<Invoice>,
        @InjectRepository(InvoiceLineItem)
        private readonly lineItemRepo: Repository<InvoiceLineItem>,
        @InjectRepository(Payment)
        private readonly paymentRepo: Repository<Payment>,
        @InjectRepository(Client)
        private readonly clientRepo: Repository<Client>,
        @InjectRepository(Firm)
        private readonly firmRepo: Repository<Firm>,
        @InjectRepository(TimeEntry)
        private readonly timeEntryRepo: Repository<TimeEntry>,
        @InjectRepository(Expense)
        private readonly expenseRepo: Repository<Expense>,
    ) { }

    /**
     * Create a new invoice
     */
    async create(firmId: string, dto: CreateInvoiceDto): Promise<InvoiceResponseDto> {
        // Verify client belongs to this firm
        const client = await this.clientRepo.findOne({
            where: { id: dto.clientId, firmId },
        });
        if (!client) {
            throw new NotFoundException('Client not found');
        }

        // Get firm for default province
        const firm = await this.firmRepo.findOne({ where: { id: firmId } });
        const province = (dto.province || firm?.province || 'ON') as CanadianProvince;

        // Generate invoice number
        const invoiceNumber = dto.invoiceNumber || await this.generateInvoiceNumber(firmId);

        // Calculate dates
        const invoiceDate = dto.invoiceDate ? new Date(dto.invoiceDate) : new Date();
        const dueDays = dto.dueDays || 30;
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + dueDays);

        // Create invoice
        const invoice = this.invoiceRepo.create({
            firmId,
            clientId: dto.clientId,
            invoiceNumber,
            invoiceDate,
            dueDate,
            status: 'draft',
            notes: dto.notes,
        });
        await this.invoiceRepo.save(invoice);

        // Create line items from time entries if provided
        const lineItems: InvoiceLineItem[] = [];
        if (dto.timeEntryIds && dto.timeEntryIds.length > 0) {
            const timeEntries = await this.timeEntryRepo.find({
                where: { id: In(dto.timeEntryIds), firmId, billable: true, billed: false },
                relations: ['user'],
            });

            for (let i = 0; i < timeEntries.length; i++) {
                const entry = timeEntries[i];
                const lineItem = this.lineItemRepo.create({
                    invoiceId: invoice.id,
                    lineType: 'time',
                    description: `${entry.user?.firstName || ''} ${entry.user?.lastName || ''}: ${entry.description}`,
                    quantity: Number(entry.hours),
                    rate: Number(entry.rate),
                    amount: Number(entry.hours) * Number(entry.rate),
                    timeEntryId: entry.id,
                    sortOrder: lineItems.length,
                });
                lineItems.push(lineItem);
            }
        }

        // Create line items from expenses if provided
        if (dto.expenseIds && dto.expenseIds.length > 0) {
            const expenses = await this.expenseRepo.find({
                where: { id: In(dto.expenseIds), firmId, billable: true, billed: false },
            });

            for (let i = 0; i < expenses.length; i++) {
                const expense = expenses[i];
                const lineItem = this.lineItemRepo.create({
                    invoiceId: invoice.id,
                    lineType: 'expense',
                    description: `Expense: ${expense.description}`,
                    quantity: 1,
                    rate: Number(expense.amount),
                    amount: Number(expense.amount),
                    expenseId: expense.id,
                    sortOrder: lineItems.length,
                    taxable: expense.taxTreatment === 'taxable',
                });
                lineItems.push(lineItem);
            }
        }

        // Add manual line items if provided
        if (dto.lineItems && dto.lineItems.length > 0) {
            const startIdx = lineItems.length;
            for (let i = 0; i < dto.lineItems.length; i++) {
                const item = dto.lineItems[i];
                const lineItem = this.lineItemRepo.create({
                    invoiceId: invoice.id,
                    lineType: item.lineType,
                    description: item.description,
                    quantity: item.quantity,
                    rate: item.rate,
                    amount: item.amount,
                    timeEntryId: item.timeEntryId,
                    expenseId: item.expenseId,
                    sortOrder: startIdx + i,
                });
                lineItems.push(lineItem);
            }
        }

        // Save line items
        if (lineItems.length > 0) {
            await this.lineItemRepo.save(lineItems);
        }

        // Calculate totals
        await this.recalculateTotals(invoice.id, province);

        // Mark time entries as billed
        if (dto.timeEntryIds && dto.timeEntryIds.length > 0) {
            await this.timeEntryRepo.update(
                { id: In(dto.timeEntryIds), firmId },
                { billed: true, invoiceId: invoice.id },
            );
        }

        // Mark expenses as billed
        if (dto.expenseIds && dto.expenseIds.length > 0) {
            await this.expenseRepo.update(
                { id: In(dto.expenseIds), firmId },
                { billed: true, invoiceId: invoice.id },
            );
        }

        // Return full invoice
        return this.findOne(firmId, invoice.id);
    }

    /**
     * Get all invoices for a firm
     */
    async findAll(
        firmId: string,
        page: number = 1,
        limit: number = 20,
        clientId?: string,
        status?: InvoiceStatus,
    ): Promise<InvoiceListResponseDto> {
        const query = this.invoiceRepo
            .createQueryBuilder('invoice')
            .leftJoinAndSelect('invoice.client', 'client')
            .where('invoice.firmId = :firmId', { firmId })
            .orderBy('invoice.invoiceDate', 'DESC');

        if (clientId) {
            query.andWhere('invoice.clientId = :clientId', { clientId });
        }

        if (status) {
            query.andWhere('invoice.status = :status', { status });
        }

        const total = await query.getCount();
        const offset = (page - 1) * limit;

        const invoices = await query
            .skip(offset)
            .take(limit)
            .getMany();

        // Calculate total outstanding
        const outstandingResult = await this.invoiceRepo
            .createQueryBuilder('invoice')
            .select('SUM(invoice.balanceDue)', 'total')
            .where('invoice.firmId = :firmId', { firmId })
            .andWhere('invoice.status NOT IN (:...statuses)', {
                statuses: ['paid', 'written_off'],
            })
            .getRawOne();

        return {
            data: invoices.map(inv => this.toResponseDto(inv, inv.client?.name)),
            total,
            page,
            limit,
            totalOutstanding: parseFloat(outstandingResult?.total || '0'),
        };
    }

    /**
     * Get a single invoice by ID with line items
     */
    async findOne(firmId: string, invoiceId: string): Promise<InvoiceResponseDto> {
        const invoice = await this.invoiceRepo.findOne({
            where: { id: invoiceId, firmId },
            relations: ['client', 'lineItems', 'firm'],
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        // Sort line items
        invoice.lineItems?.sort((a, b) => a.sortOrder - b.sortOrder);

        const province = (invoice.firm?.province || 'ON') as CanadianProvince;
        const taxBreakdown = this.getTaxBreakdown(invoice, province);

        return {
            ...this.toResponseDto(invoice, invoice.client?.name),
            lineItems: invoice.lineItems?.map(item => ({
                id: item.id,
                lineType: item.lineType,
                description: item.description,
                quantity: Number(item.quantity),
                rate: Number(item.rate),
                amount: Number(item.amount),
                timeEntryId: item.timeEntryId,
                expenseId: item.expenseId,
                sortOrder: item.sortOrder,
            })),
            taxBreakdown,
        };
    }

    /**
     * Update an invoice
     */
    async update(
        firmId: string,
        invoiceId: string,
        dto: UpdateInvoiceDto,
    ): Promise<InvoiceResponseDto> {
        const invoice = await this.invoiceRepo.findOne({
            where: { id: invoiceId, firmId },
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        // Cannot update paid invoices
        if (invoice.status === 'paid') {
            throw new ForbiddenException('Cannot modify a paid invoice');
        }

        if (dto.invoiceDate !== undefined) invoice.invoiceDate = new Date(dto.invoiceDate);
        if (dto.dueDate !== undefined) invoice.dueDate = new Date(dto.dueDate);
        if (dto.notes !== undefined) invoice.notes = dto.notes;
        if (dto.status !== undefined) invoice.status = dto.status;

        await this.invoiceRepo.save(invoice);
        return this.findOne(firmId, invoiceId);
    }

    /**
     * Record a payment against an invoice
     */
    async recordPayment(
        firmId: string,
        invoiceId: string,
        dto: RecordPaymentDto,
    ): Promise<InvoiceResponseDto> {
        const invoice = await this.invoiceRepo.findOne({
            where: { id: invoiceId, firmId },
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        if (invoice.status === 'paid') {
            throw new BadRequestException('Invoice is already fully paid');
        }

        if (dto.amount > Number(invoice.balanceDue)) {
            throw new BadRequestException('Payment amount exceeds balance due');
        }

        // Create payment record
        const payment = this.paymentRepo.create({
            firmId,
            invoiceId,
            paymentDate: new Date(dto.paymentDate),
            amount: dto.amount,
            paymentMethod: dto.paymentMethod,
            paymentSource: dto.paymentSource,
            trustTransactionId: dto.trustTransactionId,
            notes: dto.notes,
        });
        await this.paymentRepo.save(payment);

        // Update invoice amounts
        invoice.amountPaid = Number(invoice.amountPaid) + dto.amount;
        invoice.balanceDue = Number(invoice.total) - Number(invoice.amountPaid);

        // Update status
        if (invoice.balanceDue <= 0) {
            invoice.status = 'paid';
        } else if (invoice.amountPaid > 0) {
            invoice.status = 'partial';
        }

        await this.invoiceRepo.save(invoice);
        return this.findOne(firmId, invoiceId);
    }

    /**
     * Send invoice (update status to sent)
     */
    async sendInvoice(firmId: string, invoiceId: string): Promise<InvoiceResponseDto> {
        const invoice = await this.invoiceRepo.findOne({
            where: { id: invoiceId, firmId },
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        if (invoice.status !== 'draft') {
            throw new BadRequestException('Only draft invoices can be sent');
        }

        invoice.status = 'sent';
        await this.invoiceRepo.save(invoice);

        // TODO: Send email notification to client

        return this.findOne(firmId, invoiceId);
    }

    /**
     * Generate next invoice number
     */
    async generateInvoiceNumber(firmId: string): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `INV-${year}-`;

        const latestInvoice = await this.invoiceRepo
            .createQueryBuilder('invoice')
            .where('invoice.firmId = :firmId', { firmId })
            .andWhere('invoice.invoiceNumber LIKE :prefix', { prefix: `${prefix}%` })
            .orderBy('invoice.invoiceNumber', 'DESC')
            .getOne();

        if (latestInvoice) {
            const lastNumber = parseInt(latestInvoice.invoiceNumber.replace(prefix, ''), 10);
            return `${prefix}${String(lastNumber + 1).padStart(4, '0')}`;
        }

        return `${prefix}0001`;
    }

    /**
     * Recalculate invoice totals with tax
     */
    private async recalculateTotals(invoiceId: string, province: CanadianProvince): Promise<void> {
        const invoice = await this.invoiceRepo.findOne({
            where: { id: invoiceId },
            relations: ['lineItems'],
        });

        if (!invoice) return;

        const subtotal = (invoice.lineItems || []).reduce(
            (sum, item) => sum + Number(item.amount),
            0,
        );

        const taxableSubtotal = (invoice.lineItems || []).reduce(
            (sum, item) => sum + (item.taxable ? Number(item.amount) : 0),
            0,
        );

        const rates = TAX_RATES[province];
        const round = (n: number) => Math.round(n * 100) / 100;

        const taxGst = round(taxableSubtotal * rates.gst);
        const taxPst = round(taxableSubtotal * rates.pst);
        const taxHst = round(taxableSubtotal * rates.hst);
        // Note: QST is stored in taxPst for Quebec
        const taxQst = round(taxableSubtotal * rates.qst);

        const total = round(subtotal + taxGst + taxPst + taxHst + taxQst);
        const balanceDue = round(total - Number(invoice.amountPaid));

        await this.invoiceRepo.update(invoiceId, {
            subtotal: round(subtotal),
            taxGst,
            taxPst: province === 'QC' ? taxQst : taxPst, // Store QST in PST field for Quebec
            taxHst,
            total,
            balanceDue,
        });
    }

    /**
     * Get tax breakdown for display
     */
    private getTaxBreakdown(invoice: Invoice, province: CanadianProvince): TaxBreakdownDto[] {
        const breakdown: TaxBreakdownDto[] = [];

        if (Number(invoice.taxHst) > 0) {
            const rate = province === 'ON' ? '13%' : '15%';
            breakdown.push({ label: `HST (${rate})`, amount: Number(invoice.taxHst) });
        }
        if (Number(invoice.taxGst) > 0) {
            breakdown.push({ label: 'GST (5%)', amount: Number(invoice.taxGst) });
        }
        if (Number(invoice.taxPst) > 0) {
            if (province === 'QC') {
                breakdown.push({ label: 'QST (9.975%)', amount: Number(invoice.taxPst) });
            } else {
                const rate = province === 'BC' || province === 'MB' ? '7%' : '6%';
                breakdown.push({ label: `PST (${rate})`, amount: Number(invoice.taxPst) });
            }
        }

        return breakdown;
    }

    /**
     * Convert entity to response DTO
     */
    private toResponseDto(invoice: Invoice, clientName?: string): InvoiceResponseDto {
        return {
            id: invoice.id,
            firmId: invoice.firmId,
            clientId: invoice.clientId,
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: invoice.invoiceDate,
            dueDate: invoice.dueDate,
            status: invoice.status,
            subtotal: Number(invoice.subtotal),
            taxGst: Number(invoice.taxGst),
            taxPst: Number(invoice.taxPst),
            taxHst: Number(invoice.taxHst),
            total: Number(invoice.total),
            amountPaid: Number(invoice.amountPaid),
            balanceDue: Number(invoice.balanceDue),
            notes: invoice.notes,
            createdAt: invoice.createdAt,
            updatedAt: invoice.updatedAt,
            clientName,
        };
    }
}
