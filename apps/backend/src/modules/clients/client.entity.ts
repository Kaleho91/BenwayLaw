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
import { Matter } from '../matters/matter.entity';
import { Invoice } from '../invoices/invoice.entity';
import { TrustTransaction } from '../trust/trust-transaction.entity';

export type ClientType = 'individual' | 'organization';

@Entity('clients')
export class Client {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'firm_id' })
    firmId: string;

    @Column({
        name: 'client_type',
        type: 'enum',
        enum: ['individual', 'organization'],
        default: 'individual',
    })
    clientType: ClientType;

    @Column({ length: 255 })
    name: string;

    @Column({ length: 255, nullable: true })
    email: string;

    @Column({ length: 50, nullable: true })
    phone: string;

    @Column({ type: 'jsonb', default: {} })
    address: {
        street?: string;
        city?: string;
        province?: string;
        postalCode?: string;
    };

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ name: 'portal_enabled', default: false })
    portalEnabled: boolean;

    @Column({ name: 'portal_password_hash', length: 255, nullable: true })
    portalPasswordHash: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Firm, (firm) => firm.clients, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'firm_id' })
    firm: Firm;

    @OneToMany(() => Matter, (matter) => matter.client)
    matters: Matter[];

    @OneToMany(() => Invoice, (invoice) => invoice.client)
    invoices: Invoice[];

    @OneToMany(() => TrustTransaction, (tx) => tx.client)
    trustTransactions: TrustTransaction[];
}
