import { Entity, Column, PrimaryColumn, ManyToOne } from 'typeorm';
import { Student } from './student.entity';
import { Assignment } from './assignment.entity';
import { Topic } from './topic.entity';

@Entity()
export class Submission {
  @PrimaryColumn()
  student_id: string;

  @PrimaryColumn()
  assignment_id: string;

  @Column({ nullable: true })
  topic_id: string;

  @Column({ type: 'timestamp', nullable: true })
  submitted_at: Date | null;

  @Column()
  graded: boolean;

  @Column({ nullable: true })
  grade: number;

  @ManyToOne(() => Student, student => student.submissions)
  student: Student;

  @ManyToOne(() => Assignment, assignment => assignment.submissions)
  assignment: Assignment;

  @ManyToOne(() => Topic, topic => topic.submissions, { nullable: true })
  topic: Topic;
}