import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrustAccount } from './trust-account.entity';
import { TrustTransaction } from './trust-transaction.entity';
import { Client } from '../clients/client.entity';
import { Matter } from '../matters/matter.entity';
import { Invoice } from '../invoices/invoice.entity';
import { TrustController } from './trust.controller';
import { TrustService } from './trust.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            TrustAccount,
            TrustTransaction,
            Client,
            Matter,
            Invoice,
        ]),
    ],
    controllers: [TrustController],
    providers: [TrustService],
    exports: [TrustService],
})
export class TrustModule { }
