import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { Topic } from './topic.entity';
import { Student } from './student.entity';
import { Assignment } from './assignment.entity';
import { SyncLog } from './sync-log.entity';

@Entity()
export class Classroom {
  @PrimaryColumn()
  classroom_id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => Topic, topic => topic.classroom)
  topics: Topic[];

  @OneToMany(() => Student, student => student.classroom)
  students: Student[];

  @OneToMany(() => Assignment, assignment => assignment.classroom)
  assignments: Assignment[];

  @OneToMany(() => SyncLog, syncLog => syncLog.classroom)
  syncLogs: SyncLog[];
}