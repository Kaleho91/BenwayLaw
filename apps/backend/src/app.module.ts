import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { FirmsModule } from './modules/firms/firms.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { MattersModule } from './modules/matters/matters.module';
import { TimeEntriesModule } from './modules/time-entries/time-entries.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { TrustModule } from './modules/trust/trust.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { PortalModule } from './modules/portal/portal.module';
import { ComplianceModule } from './modules/compliance/compliance.module';

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),

        // Database
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('DB_HOST', 'localhost'),
                port: configService.get('DB_PORT', 5432),
                username: configService.get('DB_USERNAME', 'maplelaw'),
                password: configService.get('DB_PASSWORD', 'maplelaw_dev'),
                database: configService.get('DB_DATABASE', 'maplelaw'),
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                synchronize: false, // Use migrations in production
                logging: configService.get('NODE_ENV') === 'development',
            }),
        }),

        // Feature modules
        AuthModule,
        FirmsModule,
        UsersModule,
        ClientsModule,
        MattersModule,
        TimeEntriesModule,
        ExpensesModule,
        InvoicesModule,
        TrustModule,
        DocumentsModule,
        TasksModule,
        PortalModule,
        ComplianceModule,
    ],
})
export class AppModule { }
