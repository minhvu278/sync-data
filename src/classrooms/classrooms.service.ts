import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Classroom } from './entities/classroom.entity';
import { Student } from './entities/student.entity';
import { Assignment } from './entities/assignment.entity';
import { Submission } from './entities/submission.entity';
import { Topic } from './entities/topic.entity';
import { SyncLog } from './entities/sync-log.entity';
import { SyncClassroomsDto, SyncClassroomResult, ClassroomData, TopicResult } from './dto/sync-classrooms.dto';
import { classroom } from '@googleapis/classroom';
import { OAuth2Client } from 'google-auth-library';

// Định nghĩa kiểu cho Google Classroom Topic
interface GoogleTopic {
  topicId: string;
  name: string;
  courseId: string;
  updateTime?: string;
}

@Injectable()
export class ClassroomsService {
  private classroomClient;
  private oauth2Client: OAuth2Client;

  constructor(
    @InjectRepository(Classroom)
    private classroomRepository: Repository<Classroom>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Assignment)
    private assignmentRepository: Repository<Assignment>,
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectRepository(Topic)
    private topicRepository: Repository<Topic>,
    @InjectRepository(SyncLog)
    private syncLogRepository: Repository<SyncLog>,
  ) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
      throw new Error('Google OAuth2 credentials are missing');
    }

    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3000'
    );
    this.oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    this.classroomClient = classroom({
      version: 'v1',
      auth: this.oauth2Client,
    });
  }

  async syncClassrooms(dto: SyncClassroomsDto): Promise<SyncClassroomResult[]> {
    const { classroom_ids, topic_id } = dto;
    const result: SyncClassroomResult[] = [];

    try {
      const { token } = await this.oauth2Client.getAccessToken();
      if (!token) {
        throw new Error('Failed to obtain access token');
      }
    } catch (error) {
      console.error('Token refresh error:', error.response?.data || error.message);
      throw new HttpException(`Failed to refresh access token: ${error.message}`, HttpStatus.UNAUTHORIZED);
    }

    for (const classroom_id of classroom_ids) {
      try {
        const classroomData = await this.fetchClassroomData(classroom_id, topic_id);
        await this.saveClassroomData(classroomData);
        await this.syncLogRepository.save({
          classroom_id,
          topic_id,
          status: 'success',
          message: `Synced classroom ${classroom_id}${topic_id ? ` for topic ${topic_id}` : ''}`,
          created_at: new Date(),
        });

        const topicResults = await this.calculateTopicProgress(classroomData);
        const totalAssignments = classroomData.assignments.length;
        const totalSubmitted = classroomData.submissions.filter(s => s.submitted_at !== null).length;
        result.push({
          classroom_id,
          total_submitted: totalSubmitted,
          total_not_submitted: totalAssignments - totalSubmitted,
          total_not_graded: classroomData.submissions.filter(s => !s.graded).length,
          current_lesson: this.determineCurrentLesson(topicResults),
          topic_results: topicResults,
        });
      } catch (error) {
        console.error(`Error syncing classroom ${classroom_id}:`, error.response?.data || error.message);
        await this.syncLogRepository.save({
          classroom_id,
          topic_id,
          status: 'failed',
          message: error.message,
          created_at: new Date(),
        });
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    return result;
  }

  private async fetchClassroomData(classroom_id: string, topic_id?: string): Promise<ClassroomData> {
    try {
      const courseResponse = await this.classroomClient.courses.get({ id: classroom_id });
      const course = courseResponse.data;

      const studentsResponse = await this.classroomClient.courses.students.list({ courseId: classroom_id });
      const students = studentsResponse.data.students || [];

      let topics: GoogleTopic[] = [];
      try {
        const topicsResponse = await this.classroomClient.courses.topics.list({ courseId: classroom_id });
        topics = (topicsResponse.data.topic || []).map(topic => ({
          topicId: topic.topicId,
          name: topic.name,
          courseId: topic.courseId,
          updateTime: topic.updateTime,
        }));
      } catch (error) {
        console.error(`Failed to fetch topics for classroom_id ${classroom_id}:`, error.response?.data || error.message);
        topics = [];
      }

      const assignmentsResponse = await this.classroomClient.courses.courseWork.list({ courseId: classroom_id });
      let assignments = assignmentsResponse.data.courseWork || [];

      if (topic_id) {
        assignments = assignments.filter(a => a.topicId === topic_id);
        if (assignments.length === 0) {
          throw new Error(`No assignments found for topic ${topic_id} in classroom ${classroom_id}`);
        }
      }

      const submissions: ClassroomData['submissions'] = [];
      for (const assignment of assignments) {
        const submissionsResponse = await this.classroomClient.courses.courseWork.studentSubmissions.list({
          courseId: classroom_id,
          courseWorkId: assignment.id,
        });
        const assignmentSubmissions = (submissionsResponse.data.studentSubmissions || []).map(sub => {
          const turnedInHistory = sub.submissionHistory?.find(
            history => history.stateHistory?.state === 'TURNED_IN'
          );
          return {
            student_id: sub.userId,
            assignment_id: sub.courseWorkId,
            topic_id: assignment.topicId,
            submitted_at: turnedInHistory?.stateHistory?.stateTimestamp
              ? new Date(turnedInHistory.stateHistory.stateTimestamp)
              : null,
            graded: sub.assignedGrade !== undefined,
            grade: sub.assignedGrade ?? null,
          };
        });
        submissions.push(...assignmentSubmissions);
      }

      return {
        classroom_id,
        name: course.name || 'Unknown Classroom',
        description: course.description || '',
        students: students.map(s => ({
          student_id: s.userId,
          name: s.profile?.name?.fullName || 'Unknown Student',
          email: s.profile?.emailAddress || '',
        })),
        assignments: assignments.map(a => ({
          assignment_id: a.id,
          title: a.title || 'Unknown Assignment',
          due_date: a.dueDate
            ? new Date(`${a.dueDate.year}-${a.dueDate.month}-${a.dueDate.day}`)
            : null,
          topic_id: a.topicId,
        })),
        submissions,
        topics: topics.map(t => ({
          topic_id: t.topicId,
          name: t.name,
          order: t.name.match(/\d+/) ? parseInt(t.name.match(/\d+/)?.[0] || '0') : 0,
        })),
      };
    } catch (error) {
      console.error(`Error fetching data for classroom_id ${classroom_id}:`, error.response?.data || error.message);
      throw new Error(`Failed to fetch data from Google Classroom: ${error.message}`);
    }
  }

  private async calculateTopicProgress(classroomData: ClassroomData): Promise<TopicResult[]> {
    const topicResults: TopicResult[] = [];
    const topics = classroomData.topics || [];

    for (const topic of topics) {
      const topicAssignments = classroomData.assignments.filter(a => a.topic_id === topic.topic_id);
      const topicSubmissions = classroomData.submissions.filter(s => s.topic_id === topic.topic_id);
      const total_submitted = topicSubmissions.filter(s => s.submitted_at !== null).length;
      const total_not_submitted = topicAssignments.length - total_submitted;

      topicResults.push({
        topic_id: topic.topic_id,
        topic_name: topic.name,
        total_submitted,
        total_not_submitted,
        total_not_graded: topicSubmissions.filter(s => !s.graded).length,
      });
    }

    return topicResults.sort((a, b) => {
      const lessonA = parseInt(a.topic_name.match(/\d+/)?.[0] || '0');
      const lessonB = parseInt(b.topic_name.match(/\d+/)?.[0] || '0');
      return lessonA - lessonB;
    });
  }

  private determineCurrentLesson(topicResults: TopicResult[]): string {
    for (const topic of topicResults) {
      if (topic.total_submitted > 0) {
        return topic.topic_name;
      }
    }
    for (const topic of topicResults) {
      if (topic.total_submitted + topic.total_not_submitted > 0) {
        return topic.topic_name;
      }
    }
    return 'No lessons started';
  }

  private async saveClassroomData(data: ClassroomData) {
    const classroom = this.classroomRepository.create({
      classroom_id: data.classroom_id,
      name: data.name,
      description: data.description,
    });
    await this.classroomRepository.save(classroom);

    for (const topic of data.topics) {
      const topicEntity = this.topicRepository.create({
        topic_id: topic.topic_id,
        classroom_id: data.classroom_id,
        name: topic.name,
        order: topic.order,
      });
      await this.topicRepository.save(topicEntity);
    }

    for (const student of data.students) {
      const studentEntity = this.studentRepository.create({
        student_id: student.student_id,
        classroom_id: data.classroom_id,
        name: student.name,
        email: student.email,
      });
      await this.studentRepository.save(studentEntity);
    }

    for (const assignment of data.assignments) {
      const assignmentEntity = this.assignmentRepository.create({
        assignment_id: assignment.assignment_id,
        classroom_id: data.classroom_id,
        topic_id: assignment.topic_id,
        title: assignment.title,
        due_date: assignment.due_date,
      } as Assignment);
      await this.assignmentRepository.save(assignmentEntity);
    }

    for (const submission of data.submissions) {
      const submissionEntity = this.submissionRepository.create({
        student_id: submission.student_id,
        assignment_id: submission.assignment_id,
        topic_id: submission.topic_id,
        submitted_at: submission.submitted_at,
        graded: submission.graded,
        grade: submission.grade,
      } as Submission);
      await this.submissionRepository.save(submissionEntity);
    }
  }
}