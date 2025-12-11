import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Firm } from '../firms/firm.entity';
import { Invoice } from './invoice.entity';
import { TrustTransaction } from '../trust/trust-transaction.entity';

export type PaymentMethod = 'bank_transfer' | 'credit_card' | 'cheque' | 'cash' | 'trust_transfer';
export type PaymentSource = 'external' | 'trust';

@Entity('payments')
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'firm_id' })
    firmId: string;

    @Column({ name: 'invoice_id' })
    invoiceId: string;

    @Column({ name: 'payment_date', type: 'date' })
    paymentDate: Date;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    @Column({
        name: 'payment_method',
        type: 'enum',
        enum: ['bank_transfer', 'credit_card', 'cheque', 'cash', 'trust_transfer'],
    })
    paymentMethod: PaymentMethod;

    @Column({
        name: 'payment_source',
        type: 'enum',
        enum: ['external', 'trust'],
    })
    paymentSource: PaymentSource;

    @Column({ name: 'trust_transaction_id', nullable: true })
    trustTransactionId: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // Relations
    @ManyToOne(() => Firm, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'firm_id' })
    firm: Firm;

    @ManyToOne(() => Invoice, (invoice) => invoice.payments)
    @JoinColumn({ name: 'invoice_id' })
    invoice: Invoice;

    @ManyToOne(() => TrustTransaction, { nullable: true })
    @JoinColumn({ name: 'trust_transaction_id' })
    trustTransaction: TrustTransaction;
}
