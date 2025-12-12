import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type AuditOperation = 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'other';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  firmId: string; // Compliance logs belong to a firm

  @Column({ nullable: true })
  userId: string; // user who performed the action

  @Column()
  operation: string; // 'create', 'update', 'delete', ...

  @Column()
  entityType: string; // 'Client', 'Matter', etc.

  @Column({ nullable: true })
  entityId: string; // ID of the specific resource

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}
