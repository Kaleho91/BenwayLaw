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
import { TrustTransaction } from './trust-transaction.entity';

@Entity('trust_accounts')
export class TrustAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'firm_id' })
    firmId: string;

    @Column({ name: 'account_name', length: 255 })
    accountName: string;

    @Column({ name: 'bank_name', length: 255, nullable: true })
    bankName: string;

    @Column({ name: 'account_number_last4', length: 4, nullable: true })
    accountNumberLast4: string;

    @Column({ length: 3, default: 'CAD' })
    currency: string;

    @Column({ name: 'current_balance', type: 'decimal', precision: 14, scale: 2, default: 0 })
    currentBalance: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Firm, (firm) => firm.trustAccounts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'firm_id' })
    firm: Firm;

    @OneToMany(() => TrustTransaction, (tx) => tx.trustAccount)
    transactions: TrustTransaction[];
}
