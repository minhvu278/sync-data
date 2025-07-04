import { Entity, Column, PrimaryColumn, ManyToOne, OneToMany } from 'typeorm';
import { Classroom } from './classroom.entity';
import { Topic } from './topic.entity';
import { Submission } from './submission.entity';

@Entity()
export class Assignment {
  @PrimaryColumn()
  assignment_id: string;

  @Column()
  classroom_id: string;

  @Column({ nullable: true })
  topic_id: string;

  @Column()
  title: string;

  @Column({ type: 'date', nullable: true })
  due_date: Date | null;

  @ManyToOne(() => Classroom, classroom => classroom.assignments)
  classroom: Classroom;

  @ManyToOne(() => Topic, topic => topic.assignments, { nullable: true })
  topic: Topic;

  @OneToMany(() => Submission, submission => submission.assignment)
  submissions: Submission[];
}