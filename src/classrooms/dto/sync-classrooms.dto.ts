export class SyncClassroomsDto {
  classroom_ids: string[];
  topic_id?: string;
}

export interface ClassroomData {
  classroom_id: string;
  name: string;
  description: string;
  students: { student_id: string; name: string; email: string }[];
  assignments: { assignment_id: string; title: string; due_date: Date | null; topic_id?: string }[];
  submissions: { student_id: string; assignment_id: string; topic_id?: string; submitted_at: Date | null; graded: boolean; grade: number | null }[];
  topics: { topic_id: string; name: string; order?: number }[];
}

export interface TopicResult {
  topic_id: string;
  topic_name: string;
  total_submitted: number;
  total_not_submitted: number;
  total_not_graded: number;
}

export interface SyncClassroomResult {
  classroom_id: string;
  total_submitted: number;
  total_not_submitted: number;
  total_not_graded: number;
  current_lesson: string;
  topic_results: TopicResult[];
}