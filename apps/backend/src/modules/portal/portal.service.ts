import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../clients/client.entity';
import { Matter } from '../matters/matter.entity';
import { Invoice } from '../invoices/invoice.entity';
import { TrustTransaction } from '../trust/trust-transaction.entity';

@Injectable()
export class PortalService {
    constructor(
        @InjectRepository(Client)
        private readonly clientRepo: Repository<Client>,
        @InjectRepository(Matter)
        private readonly matterRepo: Repository<Matter>,
        @InjectRepository(Invoice)
        private readonly invoiceRepo: Repository<Invoice>,
        @InjectRepository(TrustTransaction)
        private readonly trustTransactionRepo: Repository<TrustTransaction>,
    ) { }

    /**
     * Get client profile for portal display
     */
    async getClientProfile(clientId: string) {
        const client = await this.clientRepo.findOne({
            where: { id: clientId },
            relations: ['firm'],
        });

        if (!client) {
            throw new NotFoundException('Client not found');
        }

        return {
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            address: client.address,
            firmName: client.firm?.name || '',
        };
    }

    /**
     * Get all matters for this client
     */
    async getClientMatters(clientId: string) {
        const matters = await this.matterRepo.find({
            where: { clientId },
            order: { createdAt: 'DESC' },
        });

        return matters.map(m => ({
            id: m.id,
            matterNumber: m.matterNumber,
            name: m.name,
            matterType: m.matterType,
            status: m.status,
            openDate: m.openDate,
            closeDate: m.closeDate,
            description: m.description,
        }));
    }

    /**
     * Get a specific matter (with ownership validation)
     */
    async getClientMatter(clientId: string, matterId: string) {
        const matter = await this.matterRepo.findOne({
            where: { id: matterId },
        });

        if (!matter) {
            throw new NotFoundException('Matter not found');
        }

        // Validate ownership
        if (matter.clientId !== clientId) {
            throw new ForbiddenException('Access denied');
        }

        return {
            id: matter.id,
            matterNumber: matter.matterNumber,
            name: matter.name,
            matterType: matter.matterType,
            status: matter.status,
            openDate: matter.openDate,
            closeDate: matter.closeDate,
            description: matter.description,
            billingType: matter.billingType,
        };
    }

    /**
     * Get all invoices for this client
     */
    async getClientInvoices(clientId: string) {
        const invoices = await this.invoiceRepo.find({
            where: { clientId },
            order: { invoiceDate: 'DESC' },
        });

        return invoices.map(inv => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            dueDate: inv.dueDate,
            status: inv.status,
            subtotal: Number(inv.subtotal),
            total: Number(inv.total),
            amountPaid: Number(inv.amountPaid),
            balanceDue: Number(inv.balanceDue),
        }));
    }

    /**
     * Get a specific invoice (with ownership validation)
     */
    async getClientInvoice(clientId: string, invoiceId: string) {
        const invoice = await this.invoiceRepo.findOne({
            where: { id: invoiceId },
            relations: ['lineItems'],
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        // Validate ownership
        if (invoice.clientId !== clientId) {
            throw new ForbiddenException('Access denied');
        }

        return {
            id: invoice.id,
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
            lineItems: invoice.lineItems?.map(item => ({
                id: item.id,
                description: item.description,
                quantity: Number(item.quantity),
                rate: Number(item.rate),
                amount: Number(item.amount),
            })) || [],
        };
    }

    /**
     * Get client's trust balance
     */
    async getClientTrustBalance(clientId: string) {
        const result = await this.trustTransactionRepo
            .createQueryBuilder('tx')
            .select('SUM(CASE WHEN tx.transactionType IN (\'deposit\', \'interest\') THEN tx.amount ELSE -tx.amount END)', 'balance')
            .where('tx.clientId = :clientId', { clientId })
            .getRawOne();

        return {
            balance: Number(result?.balance || 0),
        };
    }
}
