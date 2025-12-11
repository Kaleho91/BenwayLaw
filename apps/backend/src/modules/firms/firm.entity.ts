import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Client } from '../clients/client.entity';
import { Matter } from '../matters/matter.entity';
import { TrustAccount } from '../trust/trust-account.entity';
import { Invoice } from '../invoices/invoice.entity';

@Entity('firms')
export class Firm {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255 })
    name: string;

    @Column({ length: 100, unique: true })
    slug: string;

    @Column({ length: 2, default: 'ON' })
    province: string;

    @Column({ type: 'jsonb', default: {} })
    settings: {
        defaultHourlyRate?: number;
        invoiceDueDays?: number;
        trustAccountRequired?: boolean;
        billingIncrement?: number;
    };

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @OneToMany(() => User, (user) => user.firm)
    users: User[];

    @OneToMany(() => Client, (client) => client.firm)
    clients: Client[];

    @OneToMany(() => Matter, (matter) => matter.firm)
    matters: Matter[];

    @OneToMany(() => TrustAccount, (account) => account.firm)
    trustAccounts: TrustAccount[];

    @OneToMany(() => Invoice, (invoice) => invoice.firm)
    invoices: Invoice[];
}
