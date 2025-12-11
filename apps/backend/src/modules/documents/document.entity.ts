import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Firm } from '../firms/firm.entity';
import { Matter } from '../matters/matter.entity';
import { Client } from '../clients/client.entity';
import { User } from '../users/user.entity';

@Entity('documents')
export class Document {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'firm_id' })
    firmId: string;

    @Column({ name: 'matter_id', nullable: true })
    matterId: string;

    @Column({ name: 'client_id', nullable: true })
    clientId: string;

    @Column({ length: 500 })
    filename: string;

    @Column({ name: 'storage_key', length: 500 })
    storageKey: string;

    @Column({ name: 'mime_type', length: 100, nullable: true })
    mimeType: string;

    @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
    sizeBytes: number;

    @Column({ default: 1 })
    version: number;

    @Column({ name: 'uploaded_by_user_id', nullable: true })
    uploadedByUserId: string;

    @Column({ name: 'shared_with_client', default: false })
    sharedWithClient: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // Relations
    @ManyToOne(() => Firm, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'firm_id' })
    firm: Firm;

    @ManyToOne(() => Matter, (matter) => matter.documents, { nullable: true })
    @JoinColumn({ name: 'matter_id' })
    matter: Matter;

    @ManyToOne(() => Client, { nullable: true })
    @JoinColumn({ name: 'client_id' })
    client: Client;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'uploaded_by_user_id' })
    uploadedByUser: User;
}
