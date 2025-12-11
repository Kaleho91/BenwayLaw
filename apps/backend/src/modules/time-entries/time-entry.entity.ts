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
import { User } from '../users/user.entity';
import { Invoice } from '../invoices/invoice.entity';

@Entity('time_entries')
export class TimeEntry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'firm_id' })
    firmId: string;

    @Column({ name: 'matter_id' })
    matterId: string;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({ name: 'entry_date', type: 'date' })
    entryDate: Date;

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    hours: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    rate: number;

    @Column({ type: 'text' })
    description: string;

    @Column({ default: true })
    billable: boolean;

    @Column({ default: false })
    billed: boolean;

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

    @ManyToOne(() => Matter, (matter) => matter.timeEntries)
    @JoinColumn({ name: 'matter_id' })
    matter: Matter;

    @ManyToOne(() => User, (user) => user.timeEntries)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Invoice, { nullable: true })
    @JoinColumn({ name: 'invoice_id' })
    invoice: Invoice;

    // Computed
    get amount(): number {
        return Number(this.hours) * Number(this.rate);
    }
}
