import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Firm } from './firm.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Firm])],
    controllers: [],
    providers: [],
    exports: [],
})
export class FirmsModule { }
