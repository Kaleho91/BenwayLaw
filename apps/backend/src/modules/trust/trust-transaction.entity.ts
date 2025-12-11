import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Firm } from '../firms/firm.entity';
import { TrustAccount } from './trust-account.entity';
import { Matter } from '../matters/matter.entity';
import { Client } from '../clients/client.entity';
import { User } from '../users/user.entity';
import { Invoice } from '../invoices/invoice.entity';

export type TrustTransactionType =
    | 'deposit'
    | 'transfer_to_fees'
    | 'refund'
    | 'interest'
    | 'bank_charge';

@Entity('trust_transactions')
export class TrustTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'firm_id' })
    firmId: string;

    @Column({ name: 'trust_account_id' })
    trustAccountId: string;

    @Column({ name: 'matter_id', nullable: true })
    matterId: string;

    @Column({ name: 'client_id' })
    clientId: string;

    @Column({
        name: 'transaction_type',
        type: 'enum',
        enum: ['deposit', 'transfer_to_fees', 'refund', 'interest', 'bank_charge'],
    })
    transactionType: TrustTransactionType;

    @Column({ type: 'decimal', precision: 14, scale: 2 })
    amount: number;

    @Column({ name: 'balance_after', type: 'decimal', precision: 14, scale: 2 })
    balanceAfter: number;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'reference_number', length: 100, nullable: true })
    referenceNumber: string;

    @Column({ name: 'related_invoice_id', nullable: true })
    relatedInvoiceId: string;

    @Column({ name: 'transaction_date', type: 'date' })
    transactionDate: Date;

    @Column({ name: 'created_by_user_id', nullable: true })
    createdByUserId: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // Relations
    @ManyToOne(() => Firm, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'firm_id' })
    firm: Firm;

    @ManyToOne(() => TrustAccount, (account) => account.transactions)
    @JoinColumn({ name: 'trust_account_id' })
    trustAccount: TrustAccount;

    @ManyToOne(() => Matter, (matter) => matter.trustTransactions, { nullable: true })
    @JoinColumn({ name: 'matter_id' })
    matter: Matter;

    @ManyToOne(() => Client, (client) => client.trustTransactions)
    @JoinColumn({ name: 'client_id' })
    client: Client;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'created_by_user_id' })
    createdByUser: User;

    @ManyToOne(() => Invoice, { nullable: true })
    @JoinColumn({ name: 'related_invoice_id' })
    relatedInvoice: Invoice;
}
