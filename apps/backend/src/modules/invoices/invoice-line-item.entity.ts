import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';
import { TimeEntry } from '../time-entries/time-entry.entity';
import { Expense } from '../expenses/expense.entity';

export type LineItemType = 'time' | 'expense' | 'flat_fee' | 'custom';

@Entity('invoice_line_items')
export class InvoiceLineItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'invoice_id' })
    invoiceId: string;

    @Column({
        name: 'line_type',
        type: 'enum',
        enum: ['time', 'expense', 'flat_fee', 'custom'],
    })
    lineType: LineItemType;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
    quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    rate: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    @Column({ name: 'time_entry_id', nullable: true })
    timeEntryId: string;

    @Column({ name: 'expense_id', nullable: true })
    expenseId: string;

    @Column({ name: 'sort_order', default: 0 })
    sortOrder: number;

    // Relations
    @ManyToOne(() => Invoice, (invoice) => invoice.lineItems, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'invoice_id' })
    invoice: Invoice;

    @ManyToOne(() => TimeEntry, { nullable: true })
    @JoinColumn({ name: 'time_entry_id' })
    timeEntry: TimeEntry;

    @ManyToOne(() => Expense, { nullable: true })
    @JoinColumn({ name: 'expense_id' })
    expense: Expense;
}
