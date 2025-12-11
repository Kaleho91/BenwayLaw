import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Firm } from '../firms/firm.entity';
import { Matter } from '../matters/matter.entity';
import { Invoice } from '../invoices/invoice.entity';

export type TaxTreatment = 'taxable' | 'exempt' | 'zero_rated';

@Entity('expenses')
export class Expense {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'firm_id' })
    firmId: string;

    @Column({ name: 'matter_id' })
    matterId: string;

    @Column({ name: 'expense_date', type: 'date' })
    expenseDate: Date;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    @Column({ type: 'text' })
    description: string;

    @Column({ default: true })
    billable: boolean;

    @Column({ default: false })
    billed: boolean;

    @Column({
        name: 'tax_treatment',
        type: 'enum',
        enum: ['taxable', 'exempt', 'zero_rated'],
        default: 'taxable',
    })
    taxTreatment: TaxTreatment;

    @Column({ name: 'invoice_id', nullable: true })
    invoiceId: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Firm, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'firm_id' })
    firm: Firm;

    @ManyToOne(() => Matter, (matter) => matter.expenses)
    @JoinColumn({ name: 'matter_id' })
    matter: Matter;

    @ManyToOne(() => Invoice, { nullable: true })
    @JoinColumn({ name: 'invoice_id' })
    invoice: Invoice;
}
