import { Entity, Column, PrimaryColumn, ManyToOne, OneToMany } from 'typeorm';
import { Classroom } from './classroom.entity';
import { Submission } from './submission.entity';

@Entity()
export class Student {
  @PrimaryColumn()
  student_id: string;

  @Column()
  classroom_id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  email: string;

  @ManyToOne(() => Classroom, classroom => classroom.students)
  classroom: Classroom;

  @OneToMany(() => Submission, submission => submission.student)
  submissions: Submission[];
}