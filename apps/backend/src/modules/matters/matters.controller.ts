import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FirmId } from '../../common/decorators/user.decorator';
import { MattersService } from './matters.service';
import {
    CreateMatterDto,
    UpdateMatterDto,
    MatterResponseDto,
    MatterListResponseDto,
} from './matters.dto';

@ApiTags('matters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('matters')
export class MattersController {
    constructor(private readonly mattersService: MattersService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new matter' })
    @ApiResponse({ status: 201, description: 'Matter created successfully', type: MatterResponseDto })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 404, description: 'Client not found' })
    @ApiResponse({ status: 409, description: 'Matter number already exists' })
    async create(
        @FirmId() firmId: string,
        @Body() dto: CreateMatterDto,
    ): Promise<MatterResponseDto> {
        return this.mattersService.create(firmId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all matters for the firm' })
    @ApiResponse({ status: 200, description: 'List of matters', type: MatterListResponseDto })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'clientId', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, enum: ['active', 'pending', 'closed', 'archived'] })
    @ApiQuery({ name: 'search', required: false, type: String })
    async findAll(
        @FirmId() firmId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('clientId') clientId?: string,
        @Query('status') status?: string,
        @Query('search') search?: string,
    ): Promise<MatterListResponseDto> {
        return this.mattersService.findAll(
            firmId,
            parseInt(page || '1', 10),
            parseInt(limit || '20', 10),
            clientId,
            status,
            search,
        );
    }

    @Get('next-number')
    @ApiOperation({ summary: 'Generate next available matter number' })
    @ApiResponse({ status: 200, description: 'Next matter number' })
    async getNextMatterNumber(
        @FirmId() firmId: string,
    ): Promise<{ matterNumber: string }> {
        const matterNumber = await this.mattersService.generateMatterNumber(firmId);
        return { matterNumber };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a matter by ID' })
    @ApiResponse({ status: 200, description: 'Matter details', type: MatterResponseDto })
    @ApiResponse({ status: 404, description: 'Matter not found' })
    async findOne(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<MatterResponseDto> {
        return this.mattersService.findOne(firmId, id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a matter' })
    @ApiResponse({ status: 200, description: 'Matter updated successfully', type: MatterResponseDto })
    @ApiResponse({ status: 404, description: 'Matter not found' })
    async update(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateMatterDto,
    ): Promise<MatterResponseDto> {
        return this.mattersService.update(firmId, id, dto);
    }

    @Patch(':id/archive')
    @ApiOperation({ summary: 'Archive a matter' })
    @ApiResponse({ status: 200, description: 'Matter archived successfully', type: MatterResponseDto })
    @ApiResponse({ status: 404, description: 'Matter not found' })
    async archive(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<MatterResponseDto> {
        return this.mattersService.archive(firmId, id);
    }
}
