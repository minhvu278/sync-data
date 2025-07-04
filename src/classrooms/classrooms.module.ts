import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassroomsService } from './classrooms.service';
import { ClassroomsController } from './classrooms.controller';
import { Classroom } from './entities/classroom.entity';
import { Student } from './entities/student.entity';
import { Assignment } from './entities/assignment.entity';
import { Submission } from './entities/submission.entity';
import { Topic } from './entities/topic.entity';
import { SyncLog } from './entities/sync-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Classroom,
      Student,
      Assignment,
      Submission,
      Topic,
      SyncLog,
    ]),
  ],
  controllers: [ClassroomsController],
  providers: [ClassroomsService],
  exports: [ClassroomsService],
})
export class ClassroomsModule {}