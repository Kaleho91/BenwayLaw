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
import { Exclude } from 'class-transformer';
import { Firm } from '../firms/firm.entity';
import { TimeEntry } from '../time-entries/time-entry.entity';
import { Task } from '../tasks/task.entity';

export type UserRole = 'admin' | 'lawyer' | 'staff';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'firm_id' })
    firmId: string;

    @Column({ length: 255 })
    email: string;

    @Exclude()
    @Column({ name: 'password_hash', length: 255 })
    passwordHash: string;

    @Column({ name: 'first_name', length: 100 })
    firstName: string;

    @Column({ name: 'last_name', length: 100 })
    lastName: string;

    @Column({
        type: 'enum',
        enum: ['admin', 'lawyer', 'staff'],
        default: 'staff',
    })
    role: UserRole;

    @Column({ name: 'hourly_rate', type: 'decimal', precision: 10, scale: 2, default: 0 })
    hourlyRate: number;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Firm, (firm) => firm.users, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'firm_id' })
    firm: Firm;

    @OneToMany(() => TimeEntry, (entry) => entry.user)
    timeEntries: TimeEntry[];

    @OneToMany(() => Task, (task) => task.assignedUser)
    tasks: Task[];

    // Computed
    get fullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }
}
