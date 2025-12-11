import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeEntry } from './time-entry.entity';
import { Matter } from '../matters/matter.entity';
import { User } from '../users/user.entity';
import { TimeEntriesController } from './time-entries.controller';
import { TimeEntriesService } from './time-entries.service';

@Module({
    imports: [TypeOrmModule.forFeature([TimeEntry, Matter, User])],
    controllers: [TimeEntriesController],
    providers: [TimeEntriesService],
    exports: [TimeEntriesService],
})
export class TimeEntriesModule { }
