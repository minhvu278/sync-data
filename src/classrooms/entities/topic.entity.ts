import { Entity, Column, PrimaryColumn, ManyToOne, OneToMany } from 'typeorm';
import { Classroom } from './classroom.entity';
import { Assignment } from './assignment.entity';
import { Submission } from './submission.entity';
import { SyncLog } from './sync-log.entity';

@Entity()
export class Topic {
  @PrimaryColumn()
  topic_id: string;

  @Column()
  classroom_id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  order: number;

  @ManyToOne(() => Classroom, classroom => classroom.topics)
  classroom: Classroom;

  @OneToMany(() => Assignment, assignment => assignment.topic)
  assignments: Assignment[];

  @OneToMany(() => Submission, submission => submission.topic)
  submissions: Submission[];

  @OneToMany(() => SyncLog, syncLog => syncLog.topic)
  syncLogs: SyncLog[];
}