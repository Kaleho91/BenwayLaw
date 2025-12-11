import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { Firm } from '../firms/firm.entity';
import { Client } from '../clients/client.entity';
import { InvoiceLineItem } from './invoice-line-item.entity';
import { Payment } from './payment.entity';

export type InvoiceStatus =
    | 'draft'
    | 'sent'
    | 'viewed'
    | 'partial'
    | 'paid'
    | 'overdue'
    | 'written_off';

@Entity('invoices')
export class Invoice {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'firm_id' })
    firmId: string;

    @Column({ name: 'client_id' })
    clientId: string;

    @Column({ name: 'invoice_number', length: 50 })
    invoiceNumber: string;

    @Column({ name: 'invoice_date', type: 'date' })
    invoiceDate: Date;

    @Column({ name: 'due_date', type: 'date' })
    dueDate: Date;

    @Column({
        type: 'enum',
        enum: ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'written_off'],
        default: 'draft',
    })
    status: InvoiceStatus;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    subtotal: number;

    @Column({ name: 'tax_gst', type: 'decimal', precision: 10, scale: 2, default: 0 })
    taxGst: number;

    @Column({ name: 'tax_pst', type: 'decimal', precision: 10, scale: 2, default: 0 })
    taxPst: number;

    @Column({ name: 'tax_hst', type: 'decimal', precision: 10, scale: 2, default: 0 })
    taxHst: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    total: number;

    @Column({ name: 'amount_paid', type: 'decimal', precision: 12, scale: 2, default: 0 })
    amountPaid: number;

    @Column({ name: 'balance_due', type: 'decimal', precision: 12, scale: 2, default: 0 })
    balanceDue: number;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Firm, (firm) => firm.invoices, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'firm_id' })
    firm: Firm;

    @ManyToOne(() => Client, (client) => client.invoices)
    @JoinColumn({ name: 'client_id' })
    client: Client;

    @OneToMany(() => InvoiceLineItem, (item) => item.invoice)
    lineItems: InvoiceLineItem[];

    @OneToMany(() => Payment, (payment) => payment.invoice)
    payments: Payment[];
}
