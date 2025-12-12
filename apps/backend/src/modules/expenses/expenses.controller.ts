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
import { ExpensesService } from './expenses.service';
import {
    CreateExpenseDto,
    UpdateExpenseDto,
    ExpenseResponseDto,
    ExpenseListResponseDto,
} from './expenses.dto';

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new expense' })
    @ApiResponse({ status: 201, description: 'Expense created successfully', type: ExpenseResponseDto })
    async create(
        @FirmId() firmId: string,
        @Body() dto: CreateExpenseDto,
    ): Promise<ExpenseResponseDto> {
        return this.expensesService.create(firmId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all expenses' })
    @ApiResponse({ status: 200, description: 'List of expenses', type: ExpenseListResponseDto })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'matterId', required: false, type: String })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiQuery({ name: 'billable', required: false, type: Boolean })
    @ApiQuery({ name: 'billed', required: false, type: Boolean })
    async findAll(
        @FirmId() firmId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('matterId') matterId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('billable') billable?: string,
        @Query('billed') billed?: string,
    ): Promise<ExpenseListResponseDto> {
        return this.expensesService.findAll(
            firmId,
            parseInt(page || '1', 10),
            parseInt(limit || '50', 10),
            matterId,
            startDate,
            endDate,
            billable === 'true' ? true : billable === 'false' ? false : undefined,
            billed === 'true' ? true : billed === 'false' ? false : undefined,
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get an expense by ID' })
    @ApiResponse({ status: 200, description: 'Expense details', type: ExpenseResponseDto })
    @ApiResponse({ status: 404, description: 'Expense not found' })
    async findOne(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<ExpenseResponseDto> {
        return this.expensesService.findOne(firmId, id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update an expense' })
    @ApiResponse({ status: 200, description: 'Expense updated successfully', type: ExpenseResponseDto })
    @ApiResponse({ status: 403, description: 'Cannot modify billed expense' })
    @ApiResponse({ status: 404, description: 'Expense not found' })
    async update(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateExpenseDto,
    ): Promise<ExpenseResponseDto> {
        return this.expensesService.update(firmId, id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete an expense' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiResponse({ status: 204, description: 'Expense deleted successfully' })
    @ApiResponse({ status: 403, description: 'Cannot delete billed expense' })
    @ApiResponse({ status: 404, description: 'Expense not found' })
    async remove(
        @FirmId() firmId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<void> {
        await this.expensesService.remove(firmId, id);
    }
}
