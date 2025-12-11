import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './client.entity';
import { CreateClientDto, UpdateClientDto, ClientResponseDto, ClientListResponseDto } from './clients.dto';

@Injectable()
export class ClientsService {
    constructor(
        @InjectRepository(Client)
        private readonly clientRepo: Repository<Client>,
    ) { }

    /**
     * Create a new client for a firm
     */
    async create(firmId: string, dto: CreateClientDto): Promise<ClientResponseDto> {
        const client = this.clientRepo.create({
            firmId,
            name: dto.name,
            clientType: dto.clientType,
            email: dto.email,
            phone: dto.phone,
            address: dto.address || {},
            notes: dto.notes,
        });

        await this.clientRepo.save(client);
        return this.toResponseDto(client);
    }

    /**
     * Get all clients for a firm with pagination
     */
    async findAll(
        firmId: string,
        page: number = 1,
        limit: number = 20,
        search?: string,
    ): Promise<ClientListResponseDto> {
        const query = this.clientRepo
            .createQueryBuilder('client')
            .leftJoin('client.matters', 'matter', 'matter.status = :status', { status: 'active' })
            .addSelect('COUNT(matter.id)', 'matterCount')
            .where('client.firmId = :firmId', { firmId })
            .groupBy('client.id')
            .orderBy('client.name', 'ASC');

        if (search) {
            query.andWhere(
                '(client.name ILIKE :search OR client.email ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        const total = await query.getCount();
        const offset = (page - 1) * limit;

        const rawClients = await query
            .offset(offset)
            .limit(limit)
            .getRawAndEntities();

        const clients = rawClients.entities.map((client, index) => {
            const raw = rawClients.raw[index];
            return {
                ...this.toResponseDto(client),
                matterCount: parseInt(raw.matterCount || '0', 10),
            };
        });

        return {
            data: clients,
            total,
            page,
            limit,
        };
    }

    /**
     * Get a single client by ID (with firm isolation)
     */
    async findOne(firmId: string, clientId: string): Promise<ClientResponseDto> {
        const client = await this.clientRepo.findOne({
            where: { id: clientId, firmId },
            relations: ['matters'],
        });

        if (!client) {
            throw new NotFoundException('Client not found');
        }

        return {
            ...this.toResponseDto(client),
            matterCount: client.matters?.filter(m => m.status === 'active').length || 0,
        };
    }

    /**
     * Update a client
     */
    async update(firmId: string, clientId: string, dto: UpdateClientDto): Promise<ClientResponseDto> {
        const client = await this.clientRepo.findOne({
            where: { id: clientId, firmId },
        });

        if (!client) {
            throw new NotFoundException('Client not found');
        }

        // Update only provided fields
        if (dto.name !== undefined) client.name = dto.name;
        if (dto.clientType !== undefined) client.clientType = dto.clientType;
        if (dto.email !== undefined) client.email = dto.email;
        if (dto.phone !== undefined) client.phone = dto.phone;
        if (dto.address !== undefined) client.address = { ...client.address, ...dto.address };
        if (dto.notes !== undefined) client.notes = dto.notes;
        if (dto.portalEnabled !== undefined) client.portalEnabled = dto.portalEnabled;

        await this.clientRepo.save(client);
        return this.toResponseDto(client);
    }

    /**
     * Delete a client (soft delete would be better for production)
     */
    async remove(firmId: string, clientId: string): Promise<void> {
        const client = await this.clientRepo.findOne({
            where: { id: clientId, firmId },
            relations: ['matters'],
        });

        if (!client) {
            throw new NotFoundException('Client not found');
        }

        // Prevent deletion if client has active matters
        const activeMatters = client.matters?.filter(m => m.status === 'active') || [];
        if (activeMatters.length > 0) {
            throw new ForbiddenException(
                `Cannot delete client with ${activeMatters.length} active matter(s)`,
            );
        }

        await this.clientRepo.remove(client);
    }

    /**
     * Convert entity to response DTO
     */
    private toResponseDto(client: Client): ClientResponseDto {
        return {
            id: client.id,
            firmId: client.firmId,
            name: client.name,
            clientType: client.clientType,
            email: client.email,
            phone: client.phone,
            address: client.address,
            notes: client.notes,
            portalEnabled: client.portalEnabled,
            createdAt: client.createdAt,
            updatedAt: client.updatedAt,
        };
    }

    /**
     * Enable portal access for a client
     */
    async enablePortal(firmId: string, clientId: string, password: string): Promise<void> {
        const client = await this.clientRepo.findOne({
            where: { id: clientId, firmId },
        });

        if (!client) {
            throw new NotFoundException('Client not found');
        }

        if (!client.email) {
            throw new ForbiddenException('Client must have an email address to enable portal access');
        }

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const bcrypt = require('bcrypt');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        client.portalEnabled = true;
        client.portalPasswordHash = hash;

        await this.clientRepo.save(client);
    }

    /**
     * Disable portal access for a client
     */
    async disablePortal(firmId: string, clientId: string): Promise<void> {
        const client = await this.clientRepo.findOne({
            where: { id: clientId, firmId },
        });

        if (!client) {
            throw new NotFoundException('Client not found');
        }

        client.portalEnabled = false;
        client.portalPasswordHash = '';

        await this.clientRepo.save(client);
    }

    /**
     * Reset portal password for a client
     */
    async resetPortalPassword(firmId: string, clientId: string, newPassword: string): Promise<void> {
        const client = await this.clientRepo.findOne({
            where: { id: clientId, firmId },
        });

        if (!client) {
            throw new NotFoundException('Client not found');
        }

        if (!client.portalEnabled) {
            throw new ForbiddenException('Portal access is not enabled for this client');
        }

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const bcrypt = require('bcrypt');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        client.portalPasswordHash = hash;

        await this.clientRepo.save(client);
    }
}

