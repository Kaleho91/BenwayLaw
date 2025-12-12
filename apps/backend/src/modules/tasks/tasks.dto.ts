import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsDateString, IsEnum } from 'class-validator';
import { TaskPriority, TaskStatus } from './task.entity';

export class CreateTaskDto {
    @ApiProperty({ description: 'Task title' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ description: 'Detailed description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Matter ID related to this task' })
    @IsOptional()
    @IsUUID()
    matterId?: string;

    @ApiPropertyOptional({ description: 'User ID assigned to this task' })
    @IsOptional()
    @IsUUID()
    assignedUserId?: string;

    @ApiPropertyOptional({ description: 'Due date (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @ApiPropertyOptional({
        description: 'Priority level',
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    })
    @IsOptional()
    @IsEnum(['low', 'normal', 'high', 'urgent'])
    priority?: TaskPriority;

    @ApiPropertyOptional({
        description: 'Current status',
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    })
    @IsOptional()
    @IsEnum(['pending', 'in_progress', 'completed', 'cancelled'])
    status?: TaskStatus;
}

export class UpdateTaskDto {
    @ApiPropertyOptional({ description: 'Task title' })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({ description: 'Detailed description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'User ID assigned to this task' })
    @IsOptional()
    @IsUUID()
    assignedUserId?: string;

    @ApiPropertyOptional({ description: 'Due date (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @ApiPropertyOptional({
        description: 'Priority level',
        enum: ['low', 'normal', 'high', 'urgent']
    })
    @IsOptional()
    @IsEnum(['low', 'normal', 'high', 'urgent'])
    priority?: TaskPriority;

    @ApiPropertyOptional({
        description: 'Current status',
        enum: ['pending', 'in_progress', 'completed', 'cancelled']
    })
    @IsOptional()
    @IsEnum(['pending', 'in_progress', 'completed', 'cancelled'])
    status?: TaskStatus;
}

export class TaskResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    firmId: string;

    @ApiProperty()
    title: string;

    @ApiPropertyOptional()
    description?: string;

    @ApiPropertyOptional()
    matterId?: string;

    @ApiPropertyOptional()
    assignedUserId?: string;

    @ApiPropertyOptional()
    dueDate?: Date | null;

    @ApiProperty({ enum: ['low', 'normal', 'high', 'urgent'] })
    priority: TaskPriority;

    @ApiProperty({ enum: ['pending', 'in_progress', 'completed', 'cancelled'] })
    status: TaskStatus;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    // Nested info
    @ApiPropertyOptional()
    matterName?: string;

    @ApiPropertyOptional()
    assignedUserName?: string;
}

export class TaskListResponseDto {
    @ApiProperty({ type: [TaskResponseDto] })
    data: TaskResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;
}
