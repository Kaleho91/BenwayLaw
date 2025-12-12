import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from './task.entity';
import { Matter } from '../matters/matter.entity';
import { User } from '../users/user.entity';
import {
    CreateTaskDto,
    UpdateTaskDto,
    TaskResponseDto,
    TaskListResponseDto,
} from './tasks.dto';

@Injectable()
export class TasksService {
    constructor(
        @InjectRepository(Task)
        private readonly taskRepo: Repository<Task>,
        @InjectRepository(Matter)
        private readonly matterRepo: Repository<Matter>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) { }

    async create(firmId: string, dto: CreateTaskDto): Promise<TaskResponseDto> {
        // Validate relations if provided
        if (dto.matterId) {
            const matter = await this.matterRepo.findOne({
                where: { id: dto.matterId, firmId },
            });
            if (!matter) {
                throw new NotFoundException('Matter not found');
            }
        }

        if (dto.assignedUserId) {
            const user = await this.userRepo.findOne({
                where: { id: dto.assignedUserId, firmId },
            });
            if (!user) {
                throw new NotFoundException('Assigned user not found');
            }
        }

        const task = this.taskRepo.create({
            firmId,
            matterId: dto.matterId,
            assignedUserId: dto.assignedUserId,
            title: dto.title,
            description: dto.description,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
            priority: dto.priority || 'normal',
            status: dto.status || 'pending',
        });

        await this.taskRepo.save(task);
        return this.findOne(firmId, task.id);
    }

    async findAll(
        firmId: string,
        page: number = 1,
        limit: number = 20,
        matterId?: string,
        assignedUserId?: string,
        status?: TaskStatus,
        priority?: TaskPriority,
    ): Promise<TaskListResponseDto> {
        const query = this.taskRepo
            .createQueryBuilder('task')
            .leftJoinAndSelect('task.matter', 'matter')
            .leftJoinAndSelect('task.assignedUser', 'assignedUser')
            .where('task.firmId = :firmId', { firmId })
            .orderBy('task.dueDate', 'ASC')
            .addOrderBy('task.priority', 'DESC');

        if (matterId) {
            query.andWhere('task.matterId = :matterId', { matterId });
        }

        if (assignedUserId) {
            query.andWhere('task.assignedUserId = :assignedUserId', { assignedUserId });
        }

        if (status) {
            query.andWhere('task.status = :status', { status });
        }

        if (priority) {
            query.andWhere('task.priority = :priority', { priority });
        }

        const total = await query.getCount();
        const offset = (page - 1) * limit;

        const tasks = await query
            .skip(offset)
            .take(limit)
            .getMany();

        return {
            data: tasks.map(t => this.toResponseDto(t)),
            total,
            page,
            limit,
        };
    }

    async findOne(firmId: string, id: string): Promise<TaskResponseDto> {
        const task = await this.taskRepo.findOne({
            where: { id, firmId },
            relations: ['matter', 'assignedUser'],
        });

        if (!task) {
            throw new NotFoundException('Task not found');
        }

        return this.toResponseDto(task);
    }

    async update(firmId: string, id: string, dto: UpdateTaskDto): Promise<TaskResponseDto> {
        const task = await this.taskRepo.findOne({
            where: { id, firmId },
        });

        if (!task) {
            throw new NotFoundException('Task not found');
        }

        if (dto.title !== undefined) task.title = dto.title;
        if (dto.description !== undefined) task.description = dto.description;
        if (dto.dueDate !== undefined) task.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
        if (dto.priority !== undefined) task.priority = dto.priority;
        if (dto.status !== undefined) task.status = dto.status;

        if (dto.assignedUserId !== undefined) {
            // Verify user exists if not setting to null
            // (Assuming nullable update logic is handled by frontend sending null vs undefined)
            // For now, simple check:
            const user = await this.userRepo.findOne({ where: { id: dto.assignedUserId, firmId } });
            if (!user) {
                throw new NotFoundException('Assigned user not found');
            }
            task.assignedUserId = dto.assignedUserId;
        }

        await this.taskRepo.save(task);
        return this.findOne(firmId, id);
    }

    async remove(firmId: string, id: string): Promise<void> {
        const task = await this.taskRepo.findOne({
            where: { id, firmId },
        });

        if (!task) {
            throw new NotFoundException('Task not found');
        }

        await this.taskRepo.remove(task);
    }

    private toResponseDto(task: Task): TaskResponseDto {
        return {
            id: task.id,
            firmId: task.firmId,
            matterId: task.matterId,
            assignedUserId: task.assignedUserId,
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            priority: task.priority,
            status: task.status,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            matterName: task.matter?.name,
            assignedUserName: task.assignedUser ? `${task.assignedUser.firstName} ${task.assignedUser.lastName}` : undefined,
        };
    }
}
