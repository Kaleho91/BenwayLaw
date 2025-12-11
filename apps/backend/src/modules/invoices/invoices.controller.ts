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
import { InvoicesService } from './invoices.service';
import {
    CreateInvoiceDto,
    UpdateInvoiceDto,
    InvoiceResponseDto,
    InvoiceListResponseDto,
    RecordPaymentDto,
} from './invoices.dto';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
    constructor(private readonly invoicesService: InvoicesService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new invoice' })
    @ApiResponse({ status: 201, description: 'Invoice created successfully', type: InvoiceResponseDto })
    @ApiResponse({ status: 404, description: 'Client not found' })
    async create(
        @FirmId() firmId: string,
        @Body() dto: CreateInvoiceDto,
    ): Promise<InvoiceResponseDto> {
        return this.invoicesService.create(firmId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all invoices for the firm' })
    @ApiResponse({ status: 200, description: 'List of invoices', type: InvoiceListResponseDto })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'clientId', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, enum: ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'written_off'] })
    async findAll(
        @FirmId() firmId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('clientId') clientId?: string,
        @Query('status') status?: string,
    ): Promise<InvoiceListResponseDto> {
        return this.invoicesService.findAll(
            firmId,
            parseInt(page || '1', 10),
            parseInt(limit || '20', 10),
            clientId,
            status as any,
        );
    }

    @Get('next-number')
    @ApiOperation({ summary: 'Generate next available invoice number' })
    @ApiResponse({ status: 200, description: 'Next invoice number' })
    async getNextInvoiceNumber(
        @FirmId() firmId: string,
    ): Promise<{ invoiceNumber: string }> {
        const invoiceNumber = await this.invoicesService.generateInvoiceNumber(firmId);
        return { invoiceNumber };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get an invoice by ID with line items' })
    @ApiResponse({ status: 200, description: 'Invoice details', type: InvoiceResponseDto })
    @ApiResponse({ status: 404, description: 'Invoice not found' })
    async findOne(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<InvoiceResponseDto> {
        return this.invoicesService.findOne(firmId, id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update an invoice' })
    @ApiResponse({ status: 200, description: 'Invoice updated successfully', type: InvoiceResponseDto })
    @ApiResponse({ status: 403, description: 'Cannot modify paid invoice' })
    @ApiResponse({ status: 404, description: 'Invoice not found' })
    async update(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateInvoiceDto,
    ): Promise<InvoiceResponseDto> {
        return this.invoicesService.update(firmId, id, dto);
    }

    @Post(':id/payments')
    @ApiOperation({ summary: 'Record a payment against an invoice' })
    @ApiResponse({ status: 200, description: 'Payment recorded successfully', type: InvoiceResponseDto })
    @ApiResponse({ status: 400, description: 'Payment amount exceeds balance' })
    @ApiResponse({ status: 404, description: 'Invoice not found' })
    async recordPayment(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RecordPaymentDto,
    ): Promise<InvoiceResponseDto> {
        return this.invoicesService.recordPayment(firmId, id, dto);
    }

    @Patch(':id/send')
    @ApiOperation({ summary: 'Send an invoice to the client' })
    @ApiResponse({ status: 200, description: 'Invoice sent successfully', type: InvoiceResponseDto })
    @ApiResponse({ status: 400, description: 'Only draft invoices can be sent' })
    @ApiResponse({ status: 404, description: 'Invoice not found' })
    async sendInvoice(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<InvoiceResponseDto> {
        return this.invoicesService.sendInvoice(firmId, id);
    }
}
