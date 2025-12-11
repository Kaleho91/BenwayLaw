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
import { User } from '../users/user.entity';
import { TimeEntry } from '../time-entries/time-entry.entity';
import { Expense } from '../expenses/expense.entity';
import { Task } from '../tasks/task.entity';
import { TrustTransaction } from '../trust/trust-transaction.entity';
import { Document } from '../documents/document.entity';

export type MatterStatus = 'active' | 'pending' | 'closed' | 'archived';
export type BillingType = 'hourly' | 'flat_fee' | 'contingency' | 'mixed';

@Entity('matters')
export class Matter {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'firm_id' })
    firmId: string;

    @Column({ name: 'client_id' })
    clientId: string;

    @Column({ name: 'responsible_user_id', nullable: true })
    responsibleUserId: string;

    @Column({ name: 'matter_number', length: 50 })
    matterNumber: string;

    @Column({ length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'matter_type', length: 100, nullable: true })
    matterType: string;

    @Column({
        type: 'enum',
        enum: ['active', 'pending', 'closed', 'archived'],
        default: 'active',
    })
    status: MatterStatus;

    @Column({
        name: 'billing_type',
        type: 'enum',
        enum: ['hourly', 'flat_fee', 'contingency', 'mixed'],
        default: 'hourly',
    })
    billingType: BillingType;

    @Column({ name: 'flat_fee_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
    flatFeeAmount: number;

    @Column({ name: 'open_date', type: 'date', default: () => 'CURRENT_DATE' })
    openDate: Date;

    @Column({ name: 'close_date', type: 'date', nullable: true })
    closeDate: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Firm, (firm) => firm.matters, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'firm_id' })
    firm: Firm;

    @ManyToOne(() => Client, (client) => client.matters)
    @JoinColumn({ name: 'client_id' })
    client: Client;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'responsible_user_id' })
    responsibleUser: User;

    @OneToMany(() => TimeEntry, (entry) => entry.matter)
    timeEntries: TimeEntry[];

    @OneToMany(() => Expense, (expense) => expense.matter)
    expenses: Expense[];

    @OneToMany(() => Task, (task) => task.matter)
    tasks: Task[];

    @OneToMany(() => TrustTransaction, (tx) => tx.matter)
    trustTransactions: TrustTransaction[];

    @OneToMany(() => Document, (doc) => doc.matter)
    documents: Document[];
}
