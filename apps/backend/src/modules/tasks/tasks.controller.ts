import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FirmId } from '../../common/decorators/user.decorator';
import { TasksService } from './tasks.service';
import {
    CreateTaskDto,
    UpdateTaskDto,
    TaskResponseDto,
    TaskListResponseDto,
} from './tasks.dto';
import { TaskStatus, TaskPriority } from './task.entity';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new task' })
    @ApiResponse({ status: 201, description: 'Task created successfully', type: TaskResponseDto })
    async create(
        @FirmId() firmId: string,
        @Body() dto: CreateTaskDto,
    ): Promise<TaskResponseDto> {
        return this.tasksService.create(firmId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all tasks' })
    @ApiResponse({ status: 200, description: 'List of tasks', type: TaskListResponseDto })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'matterId', required: false, type: String })
    @ApiQuery({ name: 'assignedUserId', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, enum: ['pending', 'in_progress', 'completed', 'cancelled'] })
    @ApiQuery({ name: 'priority', required: false, enum: ['low', 'normal', 'high', 'urgent'] })
    async findAll(
        @FirmId() firmId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('matterId') matterId?: string,
        @Query('assignedUserId') assignedUserId?: string,
        @Query('status') status?: TaskStatus,
        @Query('priority') priority?: TaskPriority,
    ): Promise<TaskListResponseDto> {
        return this.tasksService.findAll(
            firmId,
            parseInt(page || '1', 10),
            parseInt(limit || '20', 10),
            matterId,
            assignedUserId,
            status,
            priority,
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a task by ID' })
    @ApiResponse({ status: 200, description: 'Task details', type: TaskResponseDto })
    @ApiResponse({ status: 404, description: 'Task not found' })
    async findOne(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<TaskResponseDto> {
        return this.tasksService.findOne(firmId, id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a task' })
    @ApiResponse({ status: 200, description: 'Task updated successfully', type: TaskResponseDto })
    @ApiResponse({ status: 404, description: 'Task not found' })
    async update(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateTaskDto,
    ): Promise<TaskResponseDto> {
        return this.tasksService.update(firmId, id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a task' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiResponse({ status: 204, description: 'Task deleted successfully' })
    @ApiResponse({ status: 404, description: 'Task not found' })
    async remove(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<void> {
        await this.tasksService.remove(firmId, id);
    }
}
