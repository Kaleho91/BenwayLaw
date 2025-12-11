import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

export type AuditOperation = 'create' | 'read' | 'update' | 'delete';

@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'firm_id' })
    firmId: string;

    @Column({ name: 'user_id', nullable: true })
    userId: string;

    @Column({ name: 'entity_type', length: 100 })
    entityType: string;

    @Column({ name: 'entity_id', nullable: true })
    entityId: string;

    @Column({
        type: 'enum',
        enum: ['create', 'read', 'update', 'delete'],
    })
    operation: AuditOperation;

    @Column({ name: 'old_values', type: 'jsonb', nullable: true })
    oldValues: Record<string, unknown>;

    @Column({ name: 'new_values', type: 'jsonb', nullable: true })
    newValues: Record<string, unknown>;

    @Column({ name: 'ip_address', type: 'inet', nullable: true })
    ipAddress: string;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
