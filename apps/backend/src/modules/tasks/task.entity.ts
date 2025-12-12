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

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

@Entity('tasks')
export class Task {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'firm_id' })
    firmId: string;

    @Column({ name: 'matter_id', nullable: true })
    matterId: string;

    @Column({ name: 'assigned_user_id', nullable: true })
    assignedUserId: string;

    @Column({ length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'due_date', type: 'date', nullable: true })
    dueDate: Date | null;

    @Column({
        type: 'enum',
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal',
    })
    priority: TaskPriority;

    @Column({
        type: 'enum',
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        default: 'pending',
    })
    status: TaskStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Firm, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'firm_id' })
    firm: Firm;

    @ManyToOne(() => Matter, (matter) => matter.tasks, { nullable: true })
    @JoinColumn({ name: 'matter_id' })
    matter: Matter;

    @ManyToOne(() => User, (user) => user.tasks, { nullable: true })
    @JoinColumn({ name: 'assigned_user_id' })
    assignedUser: User;
}
