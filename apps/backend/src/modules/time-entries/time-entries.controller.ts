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
import { CurrentUser, FirmId } from '../../common/decorators/user.decorator';
import { AuthUser } from '../auth/auth.service';
import { TimeEntriesService } from './time-entries.service';
import {
    CreateTimeEntryDto,
    UpdateTimeEntryDto,
    TimeEntryResponseDto,
    TimeEntryListResponseDto,
} from './time-entries.dto';

@ApiTags('time-entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('time-entries')
export class TimeEntriesController {
    constructor(private readonly timeEntriesService: TimeEntriesService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new time entry' })
    @ApiResponse({ status: 201, description: 'Time entry created successfully', type: TimeEntryResponseDto })
    @ApiResponse({ status: 404, description: 'Matter not found' })
    async create(
        @FirmId() firmId: string,
        @CurrentUser() user: AuthUser,
        @Body() dto: CreateTimeEntryDto,
    ): Promise<TimeEntryResponseDto> {
        return this.timeEntriesService.create(firmId, user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List time entries with filters' })
    @ApiResponse({ status: 200, description: 'List of time entries', type: TimeEntryListResponseDto })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'matterId', required: false, type: String })
    @ApiQuery({ name: 'userId', required: false, type: String })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'ISO 8601 date' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'ISO 8601 date' })
    @ApiQuery({ name: 'billable', required: false, type: Boolean })
    @ApiQuery({ name: 'billed', required: false, type: Boolean })
    async findAll(
        @FirmId() firmId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('matterId') matterId?: string,
        @Query('userId') userId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('billable') billable?: string,
        @Query('billed') billed?: string,
    ): Promise<TimeEntryListResponseDto> {
        return this.timeEntriesService.findAll(
            firmId,
            parseInt(page || '1', 10),
            parseInt(limit || '50', 10),
            matterId,
            userId,
            startDate,
            endDate,
            billable !== undefined ? billable === 'true' : undefined,
            billed !== undefined ? billed === 'true' : undefined,
        );
    }

    @Get('unbilled/:matterId')
    @ApiOperation({ summary: 'Get unbilled time entries for a matter' })
    @ApiResponse({ status: 200, description: 'List of unbilled time entries', type: [TimeEntryResponseDto] })
    async getUnbilledForMatter(
        @FirmId() firmId: string,
        @Param('matterId', ParseUUIDPipe) matterId: string,
    ): Promise<TimeEntryResponseDto[]> {
        return this.timeEntriesService.getUnbilledForMatter(firmId, matterId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a time entry by ID' })
    @ApiResponse({ status: 200, description: 'Time entry details', type: TimeEntryResponseDto })
    @ApiResponse({ status: 404, description: 'Time entry not found' })
    async findOne(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<TimeEntryResponseDto> {
        return this.timeEntriesService.findOne(firmId, id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a time entry' })
    @ApiResponse({ status: 200, description: 'Time entry updated successfully', type: TimeEntryResponseDto })
    @ApiResponse({ status: 403, description: 'Cannot modify billed entry' })
    @ApiResponse({ status: 404, description: 'Time entry not found' })
    async update(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateTimeEntryDto,
    ): Promise<TimeEntryResponseDto> {
        return this.timeEntriesService.update(firmId, id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a time entry' })
    @ApiResponse({ status: 204, description: 'Time entry deleted successfully' })
    @ApiResponse({ status: 403, description: 'Cannot delete billed entry' })
    @ApiResponse({ status: 404, description: 'Time entry not found' })
    async remove(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<void> {
        return this.timeEntriesService.remove(firmId, id);
    }
}
