import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './expense.entity';
import { Matter } from '../matters/matter.entity';
import {
    CreateExpenseDto,
    UpdateExpenseDto,
    ExpenseResponseDto,
    ExpenseListResponseDto,
} from './expenses.dto';

@Injectable()
export class ExpensesService {
    constructor(
        @InjectRepository(Expense)
        private readonly expenseRepo: Repository<Expense>,
        @InjectRepository(Matter)
        private readonly matterRepo: Repository<Matter>,
    ) { }

    async create(firmId: string, dto: CreateExpenseDto): Promise<ExpenseResponseDto> {
        const matter = await this.matterRepo.findOne({
            where: { id: dto.matterId, firmId },
            relations: ['client'],
        });
        if (!matter) {
            throw new NotFoundException('Matter not found');
        }

        const expense = this.expenseRepo.create({
            firmId,
            matterId: dto.matterId,
            expenseDate: new Date(dto.expenseDate),
            amount: dto.amount,
            description: dto.description,
            billable: dto.billable !== undefined ? dto.billable : true,
            taxTreatment: dto.taxTreatment || 'taxable',
        });

        await this.expenseRepo.save(expense);
        return this.toResponseDto(expense, matter.name, matter.matterNumber, matter.client?.name);
    }

    async findAll(
        firmId: string,
        page: number = 1,
        limit: number = 50,
        matterId?: string,
        startDate?: string,
        endDate?: string,
        billable?: boolean,
        billed?: boolean,
    ): Promise<ExpenseListResponseDto> {
        const query = this.expenseRepo
            .createQueryBuilder('expense')
            .leftJoinAndSelect('expense.matter', 'matter')
            .leftJoinAndSelect('matter.client', 'client')
            .where('expense.firmId = :firmId', { firmId })
            .orderBy('expense.expenseDate', 'DESC')
            .addOrderBy('expense.createdAt', 'DESC');

        if (matterId) {
            query.andWhere('expense.matterId = :matterId', { matterId });
        }

        if (startDate && endDate) {
            query.andWhere('expense.expenseDate BETWEEN :startDate AND :endDate', { startDate, endDate });
        } else if (startDate) {
            query.andWhere('expense.expenseDate >= :startDate', { startDate });
        } else if (endDate) {
            query.andWhere('expense.expenseDate <= :endDate', { endDate });
        }

        if (billable !== undefined) {
            query.andWhere('expense.billable = :billable', { billable });
        }

        if (billed !== undefined) {
            query.andWhere('expense.billed = :billed', { billed });
        }

        const total = await query.getCount();
        const offset = (page - 1) * limit;

        const expenses = await query
            .skip(offset)
            .take(limit)
            .getMany();

        const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

        return {
            data: expenses.map(e => this.toResponseDto(
                e,
                e.matter?.name,
                e.matter?.matterNumber,
                e.matter?.client?.name
            )),
            total,
            page,
            limit,
            totalAmount,
        };
    }

    async findOne(firmId: string, id: string): Promise<ExpenseResponseDto> {
        const expense = await this.expenseRepo.findOne({
            where: { id, firmId },
            relations: ['matter', 'matter.client'],
        });

        if (!expense) {
            throw new NotFoundException('Expense not found');
        }

        return this.toResponseDto(
            expense,
            expense.matter?.name,
            expense.matter?.matterNumber,
            expense.matter?.client?.name
        );
    }

    async update(firmId: string, id: string, dto: UpdateExpenseDto): Promise<ExpenseResponseDto> {
        const expense = await this.expenseRepo.findOne({
            where: { id, firmId },
            relations: ['matter', 'matter.client'],
        });

        if (!expense) {
            throw new NotFoundException('Expense not found');
        }

        if (expense.billed) {
            throw new ForbiddenException('Cannot modify a billed expense');
        }

        if (dto.expenseDate !== undefined) expense.expenseDate = new Date(dto.expenseDate);
        if (dto.amount !== undefined) expense.amount = dto.amount;
        if (dto.description !== undefined) expense.description = dto.description;
        if (dto.billable !== undefined) expense.billable = dto.billable;
        if (dto.taxTreatment !== undefined) expense.taxTreatment = dto.taxTreatment;

        await this.expenseRepo.save(expense);
        return this.toResponseDto(
            expense,
            expense.matter?.name,
            expense.matter?.matterNumber,
            expense.matter?.client?.name
        );
    }

    async remove(firmId: string, id: string): Promise<void> {
        const expense = await this.expenseRepo.findOne({
            where: { id, firmId },
        });

        if (!expense) {
            throw new NotFoundException('Expense not found');
        }

        if (expense.billed) {
            throw new ForbiddenException('Cannot delete a billed expense');
        }

        await this.expenseRepo.remove(expense);
    }

    async getUnbilledForMatter(firmId: string, matterId: string): Promise<ExpenseResponseDto[]> {
        const expenses = await this.expenseRepo.find({
            where: {
                firmId,
                matterId,
                billable: true,
                billed: false,
            },
            order: { expenseDate: 'ASC' },
        });

        return expenses.map(e => this.toResponseDto(e));
    }

    async markAsBilled(firmId: string, expenseIds: string[], invoiceId: string): Promise<void> {
        await this.expenseRepo
            .createQueryBuilder()
            .update(Expense)
            .set({ billed: true, invoiceId })
            .where('firmId = :firmId', { firmId })
            .andWhere('id IN (:...expenseIds)', { expenseIds })
            .execute();
    }

    private toResponseDto(
        expense: Expense,
        matterName?: string,
        matterNumber?: string,
        clientName?: string
    ): ExpenseResponseDto {
        return {
            id: expense.id,
            firmId: expense.firmId,
            matterId: expense.matterId,
            expenseDate: expense.expenseDate,
            amount: Number(expense.amount),
            description: expense.description,
            billable: expense.billable,
            billed: expense.billed,
            taxTreatment: expense.taxTreatment,
            invoiceId: expense.invoiceId,
            createdAt: expense.createdAt,
            updatedAt: expense.updatedAt,
            matterName,
            matterNumber,
            clientName,
        };
    }
}
