import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortalAuthService } from './portal-auth.service';
import { PortalAuthController } from './portal-auth.controller';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { PortalJwtStrategy } from './portal-jwt.strategy';
import { Client } from '../clients/client.entity';
import { Firm } from '../firms/firm.entity';
import { Matter } from '../matters/matter.entity';
import { Invoice } from '../invoices/invoice.entity';
import { TrustTransaction } from '../trust/trust-transaction.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Client, Firm, Matter, Invoice, TrustTransaction]),
        PassportModule.register({ defaultStrategy: 'portal-jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET', 'dev-secret-change-me'),
                signOptions: {
                    expiresIn: '24h',
                },
            }),
        }),
    ],
    controllers: [PortalAuthController, PortalController],
    providers: [PortalAuthService, PortalService, PortalJwtStrategy],
    exports: [PortalAuthService],
})
export class PortalModule { }
