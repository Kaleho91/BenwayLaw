import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Matter } from './matter.entity';
import { Client } from '../clients/client.entity';
import { CreateMatterDto, UpdateMatterDto, MatterResponseDto, MatterListResponseDto } from './matters.dto';

@Injectable()
export class MattersService {
    constructor(
        @InjectRepository(Matter)
        private readonly matterRepo: Repository<Matter>,
        @InjectRepository(Client)
        private readonly clientRepo: Repository<Client>,
    ) { }

    /**
     * Create a new matter for a client
     */
    async create(firmId: string, dto: CreateMatterDto): Promise<MatterResponseDto> {
        // Verify client belongs to this firm
        const client = await this.clientRepo.findOne({
            where: { id: dto.clientId, firmId },
        });
        if (!client) {
            throw new NotFoundException('Client not found');
        }

        // Check for duplicate matter number within firm
        const existingMatter = await this.matterRepo.findOne({
            where: { firmId, matterNumber: dto.matterNumber },
        });
        if (existingMatter) {
            throw new ConflictException('Matter number already exists');
        }

        const matter = this.matterRepo.create({
            firmId,
            clientId: dto.clientId,
            matterNumber: dto.matterNumber,
            name: dto.name,
            description: dto.description,
            matterType: dto.matterType,
            status: dto.status || 'active',
            billingType: dto.billingType || 'hourly',
            flatFeeAmount: dto.flatFeeAmount,
            responsibleUserId: dto.responsibleUserId,
            openDate: dto.openDate ? new Date(dto.openDate) : new Date(),
        });

        await this.matterRepo.save(matter);
        return this.toResponseDto(matter, client.name);
    }

    /**
     * Get all matters for a firm with pagination and filters
     */
    async findAll(
        firmId: string,
        page: number = 1,
        limit: number = 20,
        clientId?: string,
        status?: string,
        search?: string,
    ): Promise<MatterListResponseDto> {
        const query = this.matterRepo
            .createQueryBuilder('matter')
            .leftJoinAndSelect('matter.client', 'client')
            .leftJoinAndSelect('matter.responsibleUser', 'user')
            .where('matter.firmId = :firmId', { firmId })
            .orderBy('matter.createdAt', 'DESC');

        if (clientId) {
            query.andWhere('matter.clientId = :clientId', { clientId });
        }

        if (status) {
            query.andWhere('matter.status = :status', { status });
        }

        if (search) {
            query.andWhere(
                '(matter.name ILIKE :search OR matter.matterNumber ILIKE :search OR client.name ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        const total = await query.getCount();
        const offset = (page - 1) * limit;

        const matters = await query
            .skip(offset)
            .take(limit)
            .getMany();

        return {
            data: matters.map(m => this.toResponseDto(
                m,
                m.client?.name,
                m.responsibleUser ? `${m.responsibleUser.firstName} ${m.responsibleUser.lastName}` : undefined,
            )),
            total,
            page,
            limit,
        };
    }

    /**
     * Get a single matter by ID (with firm isolation)
     */
    async findOne(firmId: string, matterId: string): Promise<MatterResponseDto> {
        const matter = await this.matterRepo.findOne({
            where: { id: matterId, firmId },
            relations: ['client', 'responsibleUser', 'timeEntries', 'trustTransactions'],
        });

        if (!matter) {
            throw new NotFoundException('Matter not found');
        }

        // Calculate aggregates
        const unbilledTimeEntries = matter.timeEntries?.filter(t => t.billable && !t.billed) || [];
        const unbilledHours = unbilledTimeEntries.reduce((sum, t) => sum + Number(t.hours), 0);
        const unbilledAmount = unbilledTimeEntries.reduce((sum, t) => sum + Number(t.hours) * Number(t.rate), 0);

        // Calculate trust balance for this matter
        const trustBalance = (matter.trustTransactions || []).reduce((sum, tx) => {
            if (tx.transactionType === 'deposit') return sum + Number(tx.amount);
            if (tx.transactionType === 'transfer_to_fees' || tx.transactionType === 'refund') return sum - Number(tx.amount);
            return sum;
        }, 0);

        return {
            ...this.toResponseDto(
                matter,
                matter.client?.name,
                matter.responsibleUser ? `${matter.responsibleUser.firstName} ${matter.responsibleUser.lastName}` : undefined,
            ),
            unbilledHours,
            unbilledAmount,
            trustBalance,
        };
    }

    /**
     * Update a matter
     */
    async update(firmId: string, matterId: string, dto: UpdateMatterDto): Promise<MatterResponseDto> {
        const matter = await this.matterRepo.findOne({
            where: { id: matterId, firmId },
            relations: ['client'],
        });

        if (!matter) {
            throw new NotFoundException('Matter not found');
        }

        // Update only provided fields
        if (dto.name !== undefined) matter.name = dto.name;
        if (dto.description !== undefined) matter.description = dto.description;
        if (dto.matterType !== undefined) matter.matterType = dto.matterType;
        if (dto.status !== undefined) matter.status = dto.status;
        if (dto.billingType !== undefined) matter.billingType = dto.billingType;
        if (dto.flatFeeAmount !== undefined) matter.flatFeeAmount = dto.flatFeeAmount;
        if (dto.responsibleUserId !== undefined) matter.responsibleUserId = dto.responsibleUserId;
        if (dto.closeDate !== undefined) matter.closeDate = new Date(dto.closeDate);

        await this.matterRepo.save(matter);
        return this.toResponseDto(matter, matter.client?.name);
    }

    /**
     * Archive a matter (soft delete)
     */
    async archive(firmId: string, matterId: string): Promise<MatterResponseDto> {
        const matter = await this.matterRepo.findOne({
            where: { id: matterId, firmId },
            relations: ['client'],
        });

        if (!matter) {
            throw new NotFoundException('Matter not found');
        }

        matter.status = 'archived';
        matter.closeDate = new Date();

        await this.matterRepo.save(matter);
        return this.toResponseDto(matter, matter.client?.name);
    }

    /**
     * Generate next matter number for a firm
     */
    async generateMatterNumber(firmId: string): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `${year}-`;

        const latestMatter = await this.matterRepo
            .createQueryBuilder('matter')
            .where('matter.firmId = :firmId', { firmId })
            .andWhere('matter.matterNumber LIKE :prefix', { prefix: `${prefix}%` })
            .orderBy('matter.matterNumber', 'DESC')
            .getOne();

        if (latestMatter) {
            const lastNumber = parseInt(latestMatter.matterNumber.replace(prefix, ''), 10);
            return `${prefix}${String(lastNumber + 1).padStart(4, '0')}`;
        }

        return `${prefix}0001`;
    }

    /**
     * Convert entity to response DTO
     */
    private toResponseDto(
        matter: Matter,
        clientName?: string,
        responsibleUserName?: string,
    ): MatterResponseDto {
        return {
            id: matter.id,
            firmId: matter.firmId,
            clientId: matter.clientId,
            responsibleUserId: matter.responsibleUserId,
            matterNumber: matter.matterNumber,
            name: matter.name,
            description: matter.description,
            matterType: matter.matterType,
            status: matter.status,
            billingType: matter.billingType,
            flatFeeAmount: matter.flatFeeAmount,
            openDate: matter.openDate,
            closeDate: matter.closeDate,
            createdAt: matter.createdAt,
            updatedAt: matter.updatedAt,
            clientName,
            responsibleUserName,
        };
    }
}
