import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceLineItem } from './invoice-line-item.entity';
import { Payment } from './payment.entity';
import { Client } from '../clients/client.entity';
import { Firm } from '../firms/firm.entity';
import { TimeEntry } from '../time-entries/time-entry.entity';
import { Expense } from '../expenses/expense.entity';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Invoice,
            InvoiceLineItem,
            Payment,
            Client,
            Firm,
            TimeEntry,
            Expense,
        ]),
    ],
    controllers: [InvoicesController],
    providers: [InvoicesService],
    exports: [InvoicesService],
})
export class InvoicesModule { }
