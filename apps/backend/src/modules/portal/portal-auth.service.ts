import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Client } from '../clients/client.entity';
import { Firm } from '../firms/firm.entity';
import { PortalJwtPayload, PortalUser, PortalLoginResponseDto } from './portal-auth.dto';

@Injectable()
export class PortalAuthService {
    constructor(
        @InjectRepository(Client)
        private readonly clientRepo: Repository<Client>,
        @InjectRepository(Firm)
        // private readonly firmRepo: Repository<Firm>, // Removed unused dependency
        private readonly jwtService: JwtService,
    ) { }

    /**
     * Authenticate a client for portal access
     */
    async login(email: string, password: string): Promise<PortalLoginResponseDto> {
        const client = await this.clientRepo.findOne({
            where: { email },
            relations: ['firm'],
        });

        if (!client) {
            throw new UnauthorizedException('Invalid email or password');
        }

        if (!client.portalEnabled) {
            throw new UnauthorizedException('Portal access is not enabled for this account');
        }

        if (!client.portalPasswordHash) {
            throw new UnauthorizedException('Portal password not set. Contact your law firm.');
        }

        const isValidPassword = await bcrypt.compare(password, client.portalPasswordHash);
        if (!isValidPassword) {
            throw new UnauthorizedException('Invalid email or password');
        }

        const payload: PortalJwtPayload = {
            sub: client.id,
            email: client.email,
            firmId: client.firmId,
            type: 'portal',
        };

        const accessToken = this.jwtService.sign(payload, {
            expiresIn: '24h', // Longer expiry for portal users
        });

        return {
            accessToken,
            client: {
                id: client.id,
                name: client.name,
                email: client.email,
                firmId: client.firmId,
                firmName: client.firm?.name || '',
            },
        };
    }

    /**
     * Validate a portal JWT token payload
     */
    async validatePortalToken(payload: PortalJwtPayload): Promise<PortalUser | null> {
        if (payload.type !== 'portal') {
            return null;
        }

        const client = await this.clientRepo.findOne({
            where: { id: payload.sub },
        });

        if (!client || !client.portalEnabled) {
            return null;
        }

        return {
            clientId: client.id,
            email: client.email,
            firmId: client.firmId,
            name: client.name,
        };
    }

    /**
     * Enable portal access for a client (admin action)
     */
    async enablePortal(clientId: string, firmId: string, password: string): Promise<void> {
        const client = await this.clientRepo.findOne({
            where: { id: clientId, firmId },
        });

        if (!client) {
            throw new NotFoundException('Client not found');
        }

        if (!client.email) {
            throw new BadRequestException('Client must have an email address to enable portal access');
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        client.portalEnabled = true;
        client.portalPasswordHash = hash;

        await this.clientRepo.save(client);
    }

    /**
     * Disable portal access for a client (admin action)
     */
    async disablePortal(clientId: string, firmId: string): Promise<void> {
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
     * Reset portal password (admin action)
     */
    async resetPortalPassword(clientId: string, firmId: string, newPassword: string): Promise<void> {
        const client = await this.clientRepo.findOne({
            where: { id: clientId, firmId },
        });

        if (!client) {
            throw new NotFoundException('Client not found');
        }

        if (!client.portalEnabled) {
            throw new BadRequestException('Portal access is not enabled for this client');
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        client.portalPasswordHash = hash;

        await this.clientRepo.save(client);
    }
}
