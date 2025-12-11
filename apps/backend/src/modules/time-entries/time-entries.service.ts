import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeEntry } from './time-entry.entity';
import { Matter } from '../matters/matter.entity';
import { User } from '../users/user.entity';
import {
    CreateTimeEntryDto,
    UpdateTimeEntryDto,
    TimeEntryResponseDto,
    TimeEntryListResponseDto,
} from './time-entries.dto';

@Injectable()
export class TimeEntriesService {
    constructor(
        @InjectRepository(TimeEntry)
        private readonly timeEntryRepo: Repository<TimeEntry>,
        @InjectRepository(Matter)
        private readonly matterRepo: Repository<Matter>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) { }

    /**
     * Create a new time entry
     */
    async create(
        firmId: string,
        userId: string,
        dto: CreateTimeEntryDto,
    ): Promise<TimeEntryResponseDto> {
        // Verify matter belongs to this firm
        const matter = await this.matterRepo.findOne({
            where: { id: dto.matterId, firmId },
            relations: ['client'],
        });
        if (!matter) {
            throw new NotFoundException('Matter not found');
        }

        // Get user's default rate if not provided
        let rate = dto.rate;
        if (rate === undefined) {
            const user = await this.userRepo.findOne({ where: { id: userId } });
            rate = user?.hourlyRate || 0;
        }

        const timeEntry = this.timeEntryRepo.create({
            firmId,
            matterId: dto.matterId,
            userId,
            entryDate: new Date(dto.entryDate),
            hours: dto.hours,
            rate,
            description: dto.description,
            billable: dto.billable !== undefined ? dto.billable : true,
        });

        await this.timeEntryRepo.save(timeEntry);
        return this.toResponseDto(timeEntry, matter.name, matter.matterNumber, undefined, matter.client?.name);
    }

    /**
     * Get all time entries for a firm with filters
     */
    async findAll(
        firmId: string,
        page: number = 1,
        limit: number = 50,
        matterId?: string,
        userId?: string,
        startDate?: string,
        endDate?: string,
        billable?: boolean,
        billed?: boolean,
    ): Promise<TimeEntryListResponseDto> {
        const query = this.timeEntryRepo
            .createQueryBuilder('entry')
            .leftJoinAndSelect('entry.matter', 'matter')
            .leftJoinAndSelect('matter.client', 'client')
            .leftJoinAndSelect('entry.user', 'user')
            .where('entry.firmId = :firmId', { firmId })
            .orderBy('entry.entryDate', 'DESC')
            .addOrderBy('entry.createdAt', 'DESC');

        if (matterId) {
            query.andWhere('entry.matterId = :matterId', { matterId });
        }

        if (userId) {
            query.andWhere('entry.userId = :userId', { userId });
        }

        if (startDate && endDate) {
            query.andWhere('entry.entryDate BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            });
        } else if (startDate) {
            query.andWhere('entry.entryDate >= :startDate', { startDate });
        } else if (endDate) {
            query.andWhere('entry.entryDate <= :endDate', { endDate });
        }

        if (billable !== undefined) {
            query.andWhere('entry.billable = :billable', { billable });
        }

        if (billed !== undefined) {
            query.andWhere('entry.billed = :billed', { billed });
        }

        const total = await query.getCount();
        const offset = (page - 1) * limit;

        const entries = await query
            .skip(offset)
            .take(limit)
            .getMany();

        // Calculate totals
        const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
        const totalAmount = entries.reduce((sum, e) => sum + Number(e.hours) * Number(e.rate), 0);

        return {
            data: entries.map(e => this.toResponseDto(
                e,
                e.matter?.name,
                e.matter?.matterNumber,
                e.user ? `${e.user.firstName} ${e.user.lastName}` : undefined,
                e.matter?.client?.name,
            )),
            total,
            page,
            limit,
            totalHours,
            totalAmount,
        };
    }

    /**
     * Get a single time entry by ID
     */
    async findOne(firmId: string, entryId: string): Promise<TimeEntryResponseDto> {
        const entry = await this.timeEntryRepo.findOne({
            where: { id: entryId, firmId },
            relations: ['matter', 'matter.client', 'user'],
        });

        if (!entry) {
            throw new NotFoundException('Time entry not found');
        }

        return this.toResponseDto(
            entry,
            entry.matter?.name,
            entry.matter?.matterNumber,
            entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : undefined,
            entry.matter?.client?.name,
        );
    }

    /**
     * Update a time entry
     */
    async update(
        firmId: string,
        entryId: string,
        dto: UpdateTimeEntryDto,
    ): Promise<TimeEntryResponseDto> {
        const entry = await this.timeEntryRepo.findOne({
            where: { id: entryId, firmId },
            relations: ['matter', 'matter.client', 'user'],
        });

        if (!entry) {
            throw new NotFoundException('Time entry not found');
        }

        // Cannot update billed entries
        if (entry.billed) {
            throw new ForbiddenException('Cannot modify a billed time entry');
        }

        if (dto.entryDate !== undefined) entry.entryDate = new Date(dto.entryDate);
        if (dto.hours !== undefined) entry.hours = dto.hours;
        if (dto.description !== undefined) entry.description = dto.description;
        if (dto.rate !== undefined) entry.rate = dto.rate;
        if (dto.billable !== undefined) entry.billable = dto.billable;

        await this.timeEntryRepo.save(entry);
        return this.toResponseDto(
            entry,
            entry.matter?.name,
            entry.matter?.matterNumber,
            entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : undefined,
            entry.matter?.client?.name,
        );
    }

    /**
     * Delete a time entry
     */
    async remove(firmId: string, entryId: string): Promise<void> {
        const entry = await this.timeEntryRepo.findOne({
            where: { id: entryId, firmId },
        });

        if (!entry) {
            throw new NotFoundException('Time entry not found');
        }

        if (entry.billed) {
            throw new ForbiddenException('Cannot delete a billed time entry');
        }

        await this.timeEntryRepo.remove(entry);
    }

    /**
     * Get unbilled time entries for a matter (for invoicing)
     */
    async getUnbilledForMatter(firmId: string, matterId: string): Promise<TimeEntryResponseDto[]> {
        const entries = await this.timeEntryRepo.find({
            where: {
                firmId,
                matterId,
                billable: true,
                billed: false,
            },
            relations: ['user'],
            order: { entryDate: 'ASC' },
        });

        return entries.map(e => this.toResponseDto(
            e,
            undefined,
            undefined,
            e.user ? `${e.user.firstName} ${e.user.lastName}` : undefined,
        ));
    }

    /**
     * Mark time entries as billed (called during invoicing)
     */
    async markAsBilled(firmId: string, entryIds: string[], invoiceId: string): Promise<void> {
        await this.timeEntryRepo
            .createQueryBuilder()
            .update(TimeEntry)
            .set({ billed: true, invoiceId })
            .where('firmId = :firmId', { firmId })
            .andWhere('id IN (:...entryIds)', { entryIds })
            .execute();
    }

    /**
     * Convert entity to response DTO
     */
    private toResponseDto(
        entry: TimeEntry,
        matterName?: string,
        matterNumber?: string,
        userName?: string,
        clientName?: string,
    ): TimeEntryResponseDto {
        return {
            id: entry.id,
            firmId: entry.firmId,
            matterId: entry.matterId,
            userId: entry.userId,
            entryDate: entry.entryDate,
            hours: Number(entry.hours),
            rate: Number(entry.rate),
            description: entry.description,
            billable: entry.billable,
            billed: entry.billed,
            invoiceId: entry.invoiceId,
            amount: Number(entry.hours) * Number(entry.rate),
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            matterName,
            matterNumber,
            userName,
            clientName,
        };
    }
}
