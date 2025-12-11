import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './document.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Document])],
    controllers: [],
    providers: [],
    exports: [],
})
export class DocumentsModule { }
