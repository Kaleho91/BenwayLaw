import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { Firm } from '../firms/firm.entity';
import { RegisterFirmDto, LoginDto } from './auth.dto';

export interface JwtPayload {
    sub: string; // userId
    email: string;
    firmId: string;
    role: string;
}

export interface AuthUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    firmId: string;
    firmName: string;
}

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(Firm)
        private readonly firmRepo: Repository<Firm>,
        private readonly jwtService: JwtService,
    ) { }

    async registerFirm(dto: RegisterFirmDto): Promise<{ accessToken: string; user: AuthUser }> {
        // Check if email already exists
        const existingUser = await this.userRepo.findOne({ where: { email: dto.adminEmail } });
        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        // Create firm
        const slug = this.generateSlug(dto.firmName);
        const existingFirm = await this.firmRepo.findOne({ where: { slug } });
        if (existingFirm) {
            throw new ConflictException('A firm with a similar name already exists');
        }

        const firm = this.firmRepo.create({
            name: dto.firmName,
            slug,
            province: dto.province || 'ON',
            settings: {
                defaultHourlyRate: 250,
                invoiceDueDays: 30,
                billingIncrement: 6,
            },
        });
        await this.firmRepo.save(firm);

        // Create admin user
        const passwordHash = await bcrypt.hash(dto.adminPassword, 12);
        const user = this.userRepo.create({
            firmId: firm.id,
            email: dto.adminEmail,
            passwordHash,
            firstName: dto.adminFirstName,
            lastName: dto.adminLastName,
            role: 'admin',
            hourlyRate: 250,
        });
        await this.userRepo.save(user);

        // Generate token
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            firmId: firm.id,
            role: user.role,
        };
        const accessToken = this.jwtService.sign(payload);

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                firmId: firm.id,
                firmName: firm.name,
            },
        };
    }

    async login(dto: LoginDto): Promise<{ accessToken: string; user: AuthUser }> {
        const user = await this.userRepo.findOne({
            where: { email: dto.email },
            relations: ['firm'],
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            firmId: user.firmId,
            role: user.role,
        };
        const accessToken = this.jwtService.sign(payload);

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                firmId: user.firmId,
                firmName: user.firm.name,
            },
        };
    }

    async validateUser(payload: JwtPayload): Promise<AuthUser | null> {
        const user = await this.userRepo.findOne({
            where: { id: payload.sub },
            relations: ['firm'],
        });

        if (!user || !user.isActive) {
            return null;
        }

        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            firmId: user.firmId,
            firmName: user.firm.name,
        };
    }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50);
    }
}
