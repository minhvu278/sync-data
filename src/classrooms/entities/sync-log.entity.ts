import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Classroom } from './classroom.entity';
import { Topic } from './topic.entity';

@Entity()
export class SyncLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  classroom_id: string;

  @Column({ nullable: true })
  topic_id: string;

  @Column()
  status: string;

  @Column()
  message: string;

  @Column()
  created_at: Date;

  @ManyToOne(() => Classroom, classroom => classroom.syncLogs)
  classroom: Classroom;

  @ManyToOne(() => Topic, topic => topic.syncLogs, { nullable: true })
  topic: Topic;
}