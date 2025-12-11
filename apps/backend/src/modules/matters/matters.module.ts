import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Matter } from './matter.entity';
import { Client } from '../clients/client.entity';
import { MattersController } from './matters.controller';
import { MattersService } from './matters.service';

@Module({
    imports: [TypeOrmModule.forFeature([Matter, Client])],
    controllers: [MattersController],
    providers: [MattersService],
    exports: [MattersService],
})
export class MattersModule { }
