import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Classroom } from '../classrooms/entities/classroom.entity';
import { Student } from '../classrooms/entities/student.entity';
import { Assignment } from '../classrooms/entities/assignment.entity';
import { Submission } from '../classrooms/entities/submission.entity';
import { SyncLog } from '../classrooms/entities/sync-log.entity';
import { Topic } from 'src/classrooms/entities/topic.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || '103.221.221.110',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  username: process.env.DB_USERNAME || 'sync_user',
  password: process.env.DB_PASSWORD || 'ZKAvSKrw8BJK',
  database: process.env.DB_DATABASE || 'sync_data',
  entities: [Classroom, Student, Assignment, Submission, Topic, SyncLog],
  synchronize: true,
};