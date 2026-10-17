export interface StudentRecord {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  semester: number | null;
  email: string;

  // 1. Academic
  cgpa: number | null; // 0.0 - 10.0
  backlogs: number | null; // 0, 1, 2...
  internalMarks: number | null; // 0 - 100

  // 2. Attendance
  attendancePercentage: number | null; // 0 - 100%
  assignmentsLate?: number | null;

  // 3. LMS Engagement
  lmsCompletionRate: number | null; // 0 - 100%
  lmsLoginFrequency: number | null; // logins per week

  // 4. Engagement (Events, Clubs, Hackathons, Certifications)
  certificationsCount: number | null;
  hackathonParticipation: number | null;
  clubsEvents: string;

  // 5. Placement (Aptitude, Coding, Mock Interviews)
  aptitudeScore: number | null; // 0 - 100
  codingScore: number | null; // 0 - 100
  mockInterviewScore: number | null; // 0 - 100

  // 6. Skills (Technical and Soft-skill assessments)
  technicalAssessment: number | null; // 0 - 100
  softSkillScore: number | null; // 0 - 100

  // 7. Feedback (Student satisfaction, Faculty feedback)
  facultyFeedback: string;
  studentSatisfaction: number | null; // 1.0 - 5.0

  // Calculated Metrics
  academicScore: number | null; // 0 - 100
  placementScore: number | null; // 0 - 100
  successScore: number | null; // 0 - 100
  riskCategory: 'High Risk' | 'Medium Risk' | 'Low Risk' | 'Unknown';
  riskReasons: string[];
  riskFactorCount?: number;
  
  // Dual-risk flags (KPMG Core Scope)
  academicRisk: boolean | null;
  placementRisk: boolean | null;
  placementStatus?: string | null;

  // Bonus: Segmentation
  segment:
    | 'Scholars (High Academics & Placement)'
    | 'Academic Focus (High CGPA, Low Placement)'
    | 'Tech Coders (Low CGPA, High Placement)'
    | 'Critical Intervention (Dual Risk)'
    | 'Unknown';

  // Bonus: Explainable Score Drivers
  keyDrivers: {
    positive: string[];
    negative: string[];
  };
}

export interface Intervention {
  id: string;
  studentId: string;
  studentName: string;
  department: string;
  type: 'Academic Remedial' | 'Coding Bootcamp' | 'Attendance Counseling' | 'Faculty Mentorship' | 'Mock Interview Prep';
  assignedTo: string;
  date: string;
  status: 'Scheduled' | 'In Progress' | 'Completed';
  notes: string;
}

export type ViewKey =
  | 'overview'
  | 'students'
  | 'risk-analysis'
  | 'segments'
  | 'interventions'
  | 'llm-insights'
  | 'pitch-deck'
  | 'reports'
  | 'lms-engagement'
  | 'upload-data'
  | 'data-schema'
  | 'dashboard'
  | 'analytics'
  | 'input-logs';

export interface LogEntry {
  id: string;
  studentName: string;
  studyHours: number;
  stressLevel: number;
  successScore: number;
  timestamp: number;
}
