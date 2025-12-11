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
import { ClientsService } from './clients.service';
import {
    CreateClientDto,
    UpdateClientDto,
    ClientResponseDto,
    ClientListResponseDto,
} from './clients.dto';

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
    constructor(private readonly clientsService: ClientsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new client' })
    @ApiResponse({ status: 201, description: 'Client created successfully', type: ClientResponseDto })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async create(
        @FirmId() firmId: string,
        @Body() dto: CreateClientDto,
    ): Promise<ClientResponseDto> {
        return this.clientsService.create(firmId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all clients for the firm' })
    @ApiResponse({ status: 200, description: 'List of clients', type: ClientListResponseDto })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    async findAll(
        @FirmId() firmId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
    ): Promise<ClientListResponseDto> {
        return this.clientsService.findAll(
            firmId,
            parseInt(page || '1', 10),
            parseInt(limit || '20', 10),
            search,
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a client by ID' })
    @ApiResponse({ status: 200, description: 'Client details', type: ClientResponseDto })
    @ApiResponse({ status: 404, description: 'Client not found' })
    async findOne(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<ClientResponseDto> {
        return this.clientsService.findOne(firmId, id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a client' })
    @ApiResponse({ status: 200, description: 'Client updated successfully', type: ClientResponseDto })
    @ApiResponse({ status: 404, description: 'Client not found' })
    async update(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateClientDto,
    ): Promise<ClientResponseDto> {
        return this.clientsService.update(firmId, id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a client' })
    @ApiResponse({ status: 204, description: 'Client deleted successfully' })
    @ApiResponse({ status: 403, description: 'Cannot delete client with active matters' })
    @ApiResponse({ status: 404, description: 'Client not found' })
    async remove(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<void> {
        return this.clientsService.remove(firmId, id);
    }

    // Portal Management Endpoints

    @Post(':id/portal/enable')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Enable portal access for a client' })
    @ApiResponse({ status: 200, description: 'Portal access enabled' })
    @ApiResponse({ status: 400, description: 'Client has no email address' })
    @ApiResponse({ status: 404, description: 'Client not found' })
    async enablePortal(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: { password: string },
    ): Promise<{ message: string }> {
        await this.clientsService.enablePortal(firmId, id, dto.password);
        return { message: 'Portal access enabled' };
    }

    @Post(':id/portal/disable')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Disable portal access for a client' })
    @ApiResponse({ status: 200, description: 'Portal access disabled' })
    @ApiResponse({ status: 404, description: 'Client not found' })
    async disablePortal(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<{ message: string }> {
        await this.clientsService.disablePortal(firmId, id);
        return { message: 'Portal access disabled' };
    }

    @Post(':id/portal/reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset portal password for a client' })
    @ApiResponse({ status: 200, description: 'Portal password reset' })
    @ApiResponse({ status: 400, description: 'Portal not enabled' })
    @ApiResponse({ status: 404, description: 'Client not found' })
    async resetPortalPassword(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: { password: string },
    ): Promise<{ message: string }> {
        await this.clientsService.resetPortalPassword(firmId, id, dto.password);
        return { message: 'Portal password reset' };
    }
}

