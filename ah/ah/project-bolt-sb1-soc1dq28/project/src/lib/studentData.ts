import type { StudentRecord, Intervention } from '@/types';
import riskConfig from '../../../../../risk_config.json';

const STORAGE_KEY_STUDENTS = 'smartcampus_students_v1';
const STORAGE_KEY_INTERVENTIONS = 'smartcampus_interventions_v1';

export type StudentMetricsInput = Partial<
  Pick<
    StudentRecord,
    | 'cgpa'
    | 'backlogs'
    | 'internalMarks'
    | 'attendancePercentage'
    | 'lmsCompletionRate'
    | 'lmsLoginFrequency'
    | 'assignmentsLate'
    | 'aptitudeScore'
    | 'codingScore'
    | 'mockInterviewScore'
  >
>;

export interface StudentMetrics {
  academicScore: number | null;
  placementScore: number | null;
  successScore: number | null;
  riskCategory: StudentRecord['riskCategory'];
  riskReasons: string[];
  riskFactorCount: number;
  academicRisk: boolean | null;
  placementRisk: boolean | null;
  segment: StudentRecord['segment'];
  keyDrivers: { positive: string[]; negative: string[] };
}

function finiteValue(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function calculateStudentMetrics(data: StudentMetricsInput): StudentMetrics {
  const cgpa = finiteValue(data.cgpa);
  const attendance = finiteValue(data.attendancePercentage);
  const lateAssignments = finiteValue(data.assignmentsLate);
  const logins = finiteValue(data.lmsLoginFrequency);
  const lmsCompletion = finiteValue(data.lmsCompletionRate);
  const aptitude = finiteValue(data.aptitudeScore);
  const coding = finiteValue(data.codingScore);
  const mockInterview = finiteValue(data.mockInterviewScore);
  const { riskThresholds, successScoreWeights, placementComponentWeights, segmentThresholds } =
    riskConfig;

  const academicScore =
    cgpa === undefined ? null : Math.max(0, Math.min(100, Math.round(cgpa * 10)));
  const placementComponents = [
    [aptitude, placementComponentWeights.aptitude],
    [coding, placementComponentWeights.coding],
    [mockInterview, placementComponentWeights.mockInterview],
  ].filter((component): component is [number, number] => component[0] !== undefined);
  const placementWeight = placementComponents.reduce((sum, [, weight]) => sum + weight, 0);
  const placementScore =
    placementWeight === 0
      ? null
      : Math.round(
          placementComponents.reduce((sum, [score, weight]) => sum + score * weight, 0) /
            placementWeight,
        );

  const scoreComponents: Array<[number | undefined, number]> = [
    [academicScore ?? undefined, successScoreWeights.academic],
    [attendance, successScoreWeights.attendance],
    [lmsCompletion ?? logins, successScoreWeights.lms],
    [placementScore ?? undefined, successScoreWeights.placement],
  ];
  const availableComponents = scoreComponents.filter(
    (component): component is [number, number] => component[0] !== undefined,
  );
  const availableWeight = availableComponents.reduce((sum, [, weight]) => sum + weight, 0);
  const successScore =
    availableWeight === 0
      ? null
      : Math.round(
          availableComponents.reduce((sum, [score, weight]) => sum + score * weight, 0) /
            availableWeight,
        );

  const riskReasons: string[] = [];
  const knownFactors: boolean[] = [];
  if (attendance !== undefined) {
    const isBad = attendance < riskThresholds.attendancePercentBelow;
    knownFactors.push(isBad);
    if (isBad) {
      riskReasons.push(
        `Attendance ${attendance}% (below ${riskThresholds.attendancePercentBelow}%)`,
      );
    }
  }
  if (cgpa !== undefined) {
    const isBad = cgpa < riskThresholds.cgpaBelow;
    knownFactors.push(isBad);
    if (isBad) riskReasons.push(`CGPA ${cgpa} (below ${riskThresholds.cgpaBelow})`);
  }
  if (logins !== undefined) {
    const isBad = logins < riskThresholds.lmsLoginsBelow;
    knownFactors.push(isBad);
    if (isBad) riskReasons.push(`LMS logins ${logins} (below ${riskThresholds.lmsLoginsBelow})`);
  }
  if (lateAssignments !== undefined) {
    const isBad = lateAssignments > riskThresholds.lateAssignmentsAbove;
    knownFactors.push(isBad);
    if (isBad) {
      riskReasons.push(
        `${lateAssignments} late assignments (above ${riskThresholds.lateAssignmentsAbove})`,
      );
    }
  }

  const riskFactorCount = knownFactors.filter(Boolean).length;
  const riskCategory: StudentRecord['riskCategory'] =
    knownFactors.length === 0
      ? 'Unknown'
      : riskFactorCount >= riskThresholds.highRiskFactorCount
        ? 'High Risk'
        : riskFactorCount === 1
          ? 'Medium Risk'
          : 'Low Risk';
  const academicRiskFactors = [
    attendance === undefined ? undefined : attendance < riskThresholds.attendancePercentBelow,
    cgpa === undefined ? undefined : cgpa < riskThresholds.cgpaBelow,
    lateAssignments === undefined
      ? undefined
      : lateAssignments > riskThresholds.lateAssignmentsAbove,
  ].filter((value): value is boolean => value !== undefined);
  const academicRisk =
    academicRiskFactors.length === 0 ? null : academicRiskFactors.some(Boolean);
  const placementRisk = logins === undefined ? null : logins < riskThresholds.lmsLoginsBelow;

  const positive: string[] = [];
  if (cgpa !== undefined && cgpa >= segmentThresholds.highCgpa) {
    positive.push(`Strong CGPA (${cgpa})`);
  }
  if (attendance !== undefined && attendance >= riskThresholds.attendancePercentBelow) {
    positive.push(`Attendance meets threshold (${attendance}%)`);
  }
  if (logins !== undefined && logins >= riskThresholds.lmsLoginsBelow) {
    positive.push(`LMS activity meets threshold (${logins})`);
  }
  if (
    lateAssignments !== undefined &&
    lateAssignments <= riskThresholds.lateAssignmentsAbove
  ) {
    positive.push(`Late assignments within threshold (${lateAssignments})`);
  }

  let segment: StudentRecord['segment'] = 'Unknown';
  if (academicScore !== null && placementScore !== null) {
    const highAcademic = cgpa !== undefined && cgpa >= segmentThresholds.highCgpa;
    const highPlacement = placementScore >= segmentThresholds.highPlacementScore;
    if (highAcademic && highPlacement) {
      segment = 'Scholars (High Academics & Placement)';
    } else if (highAcademic) {
      segment = 'Academic Focus (High CGPA, Low Placement)';
    } else if (highPlacement) {
      segment = 'Tech Coders (Low CGPA, High Placement)';
    } else if (academicScore < segmentThresholds.lowAcademicScore) {
      segment = 'Critical Intervention (Dual Risk)';
    }
  }

  return {
    academicScore,
    placementScore,
    successScore,
    riskCategory,
    riskReasons,
    riskFactorCount,
    academicRisk,
    placementRisk,
    segment,
    keyDrivers: { positive, negative: riskReasons },
  };
}

export function getSuccessScoreBreakdown(data: StudentMetricsInput) {
  const metrics = calculateStudentMetrics(data);
  const availableWeight = [
    [metrics.academicScore, riskConfig.successScoreWeights.academic],
    [finiteValue(data.attendancePercentage) ?? null, riskConfig.successScoreWeights.attendance],
    [
      finiteValue(data.lmsCompletionRate) ?? finiteValue(data.lmsLoginFrequency) ?? null,
      riskConfig.successScoreWeights.lms,
    ],
    [metrics.placementScore, riskConfig.successScoreWeights.placement],
  ].reduce((total, [score, weight]) => total + (score === null ? 0 : Number(weight)), 0);
  const components = [
    { label: 'Academic', score: metrics.academicScore, weight: riskConfig.successScoreWeights.academic },
    {
      label: 'Attendance',
      score: finiteValue(data.attendancePercentage) ?? null,
      weight: riskConfig.successScoreWeights.attendance,
    },
    {
      label: 'LMS',
      score: finiteValue(data.lmsCompletionRate) ?? finiteValue(data.lmsLoginFrequency) ?? null,
      weight: riskConfig.successScoreWeights.lms,
    },
    { label: 'Placement', score: metrics.placementScore, weight: riskConfig.successScoreWeights.placement },
  ];
  return components.map(({ label, score, weight }) => ({
    label,
    score,
    effectiveWeight: score === null || availableWeight === 0 ? null : weight / availableWeight,
    contribution:
      score === null || availableWeight === 0 ? null : score * (weight / availableWeight),
  }));
}

export function generateBenchmarkStudents(): StudentRecord[] {
  const departments = ['Computer Science', 'Information Technology', 'Electronics & Comm.', 'Mechanical Eng.', 'Data Science & AI'];

  type BenchmarkStudentInput = Omit<
    StudentRecord,
    | 'academicScore'
    | 'placementScore'
    | 'successScore'
    | 'riskCategory'
    | 'riskReasons'
    | 'riskFactorCount'
    | 'academicRisk'
    | 'placementRisk'
    | 'segment'
    | 'keyDrivers'
    | 'clubsEvents'
    | 'softSkillScore'
    | 'facultyFeedback'
    | 'studentSatisfaction'
    | 'semester'
    | 'cgpa'
    | 'backlogs'
    | 'internalMarks'
    | 'attendancePercentage'
    | 'lmsCompletionRate'
    | 'lmsLoginFrequency'
    | 'aptitudeScore'
    | 'codingScore'
    | 'mockInterviewScore'
    | 'technicalAssessment'
    | 'certificationsCount'
    | 'hackathonParticipation'
  > & {
    semester: number;
    cgpa: number;
    backlogs: number;
    internalMarks: number;
    attendancePercentage: number;
    lmsCompletionRate: number;
    lmsLoginFrequency: number;
    aptitudeScore: number;
    codingScore: number;
    mockInterviewScore: number;
    technicalAssessment: number;
    certificationsCount: number;
    hackathonParticipation: number;
  };
  const rawList: BenchmarkStudentInput[] = [
    {
      id: 'st-01',
      name: 'Aarav Sharma',
      rollNumber: 'CS21-042',
      department: 'Computer Science',
      semester: 7,
      email: 'aarav.sharma@campus.edu',
      cgpa: 9.3,
      backlogs: 0,
      internalMarks: 94,
      attendancePercentage: 92,
      lmsCompletionRate: 95,
      lmsLoginFrequency: 14,
      aptitudeScore: 88,
      codingScore: 92,
      mockInterviewScore: 90,
      technicalAssessment: 91,
      certificationsCount: 4,
      hackathonParticipation: 3,
    },
    {
      id: 'st-02',
      name: 'Diya Patel',
      rollNumber: 'IT21-104',
      department: 'Information Technology',
      semester: 7,
      email: 'diya.patel@campus.edu',
      cgpa: 8.8,
      backlogs: 0,
      internalMarks: 86,
      attendancePercentage: 88,
      lmsCompletionRate: 85,
      lmsLoginFrequency: 11,
      aptitudeScore: 54,
      codingScore: 48,
      mockInterviewScore: 50,
      technicalAssessment: 52,
      certificationsCount: 1,
      hackathonParticipation: 0,
    },
    {
      id: 'st-03',
      name: 'Rohan Verma',
      rollNumber: 'CS21-089',
      department: 'Computer Science',
      semester: 7,
      email: 'rohan.verma@campus.edu',
      cgpa: 6.2,
      backlogs: 1,
      internalMarks: 68,
      attendancePercentage: 71,
      lmsCompletionRate: 70,
      lmsLoginFrequency: 8,
      aptitudeScore: 85,
      codingScore: 94,
      mockInterviewScore: 82,
      technicalAssessment: 90,
      certificationsCount: 3,
      hackathonParticipation: 4,
    },
    {
      id: 'st-04',
      name: 'Ananya Iyer',
      rollNumber: 'EC21-015',
      department: 'Electronics & Comm.',
      semester: 7,
      email: 'ananya.iyer@campus.edu',
      cgpa: 5.4,
      backlogs: 2,
      internalMarks: 52,
      attendancePercentage: 64,
      lmsCompletionRate: 45,
      lmsLoginFrequency: 4,
      aptitudeScore: 42,
      codingScore: 38,
      mockInterviewScore: 40,
      technicalAssessment: 45,
      certificationsCount: 0,
      hackathonParticipation: 0,
    },
    {
      id: 'st-05',
      name: 'Vikram Sengupta',
      rollNumber: 'DS21-031',
      department: 'Data Science & AI',
      semester: 5,
      email: 'vikram.s@campus.edu',
      cgpa: 8.1,
      backlogs: 0,
      internalMarks: 82,
      attendancePercentage: 84,
      lmsCompletionRate: 80,
      lmsLoginFrequency: 10,
      aptitudeScore: 78,
      codingScore: 82,
      mockInterviewScore: 76,
      technicalAssessment: 80,
      certificationsCount: 2,
      hackathonParticipation: 2,
    },
    {
      id: 'st-06',
      name: 'Sneha Reddy',
      rollNumber: 'CS21-118',
      department: 'Computer Science',
      semester: 7,
      email: 'sneha.reddy@campus.edu',
      cgpa: 7.9,
      backlogs: 0,
      internalMarks: 78,
      attendancePercentage: 74,
      lmsCompletionRate: 65,
      lmsLoginFrequency: 6,
      aptitudeScore: 62,
      codingScore: 58,
      mockInterviewScore: 60,
      technicalAssessment: 65,
      certificationsCount: 1,
      hackathonParticipation: 1,
    },
    {
      id: 'st-07',
      name: 'Kabir Mehta',
      rollNumber: 'ME21-055',
      department: 'Mechanical Eng.',
      semester: 7,
      email: 'kabir.mehta@campus.edu',
      cgpa: 5.8,
      backlogs: 3,
      internalMarks: 58,
      attendancePercentage: 61,
      lmsCompletionRate: 40,
      lmsLoginFrequency: 3,
      aptitudeScore: 48,
      codingScore: 35,
      mockInterviewScore: 45,
      technicalAssessment: 40,
      certificationsCount: 0,
      hackathonParticipation: 0,
    },
    {
      id: 'st-08',
      name: 'Pooja Kulkarni',
      rollNumber: 'IT21-073',
      department: 'Information Technology',
      semester: 5,
      email: 'pooja.k@campus.edu',
      cgpa: 9.1,
      backlogs: 0,
      internalMarks: 90,
      attendancePercentage: 94,
      lmsCompletionRate: 92,
      lmsLoginFrequency: 15,
      aptitudeScore: 86,
      codingScore: 88,
      mockInterviewScore: 85,
      technicalAssessment: 88,
      certificationsCount: 3,
      hackathonParticipation: 2,
    },
    {
      id: 'st-09',
      name: 'Arjun Nair',
      rollNumber: 'EC21-082',
      department: 'Electronics & Comm.',
      semester: 7,
      email: 'arjun.nair@campus.edu',
      cgpa: 8.5,
      backlogs: 0,
      internalMarks: 84,
      attendancePercentage: 86,
      lmsCompletionRate: 82,
      lmsLoginFrequency: 9,
      aptitudeScore: 50,
      codingScore: 45,
      mockInterviewScore: 48,
      technicalAssessment: 50,
      certificationsCount: 1,
      hackathonParticipation: 0,
    },
    {
      id: 'st-10',
      name: 'Ishaan Joshi',
      rollNumber: 'CS21-012',
      department: 'Computer Science',
      semester: 7,
      email: 'ishaan.joshi@campus.edu',
      cgpa: 6.8,
      backlogs: 0,
      internalMarks: 72,
      attendancePercentage: 80,
      lmsCompletionRate: 75,
      lmsLoginFrequency: 9,
      aptitudeScore: 76,
      codingScore: 85,
      mockInterviewScore: 80,
      technicalAssessment: 82,
      certificationsCount: 2,
      hackathonParticipation: 3,
    },
  ];

  // Generate 40 total realistic students for realistic distribution
  const extendedNames = [
    'Priya Deshmukh', 'Aditya Rao', 'Meera Nambiar', 'Manish Pandey', 'Tara Choudhury',
    'Sameer Ghosh', 'Neha Bhatt', 'Karan Singhania', 'Rhea Kapoor', 'Devendra Yadav',
    'Siddharth Jain', 'Tanvi Mathur', 'Varun Goswami', 'Anjali Saxena', 'Kunal Tiwari',
    'Shreya Sen', 'Harsh Vardhan', 'Bhavna Menon', 'Gaurav Mukherjee', 'Swati Das'
  ];

  extendedNames.forEach((name, idx) => {
    const isHighPerformer = idx % 4 === 0;
    const isAcademicOnly = idx % 4 === 1;
    const isTechCoder = idx % 4 === 2;
    // Critical is idx % 4 === 3

    let cgpa = 7.0;
    let backlogs = 0;
    let attendance = 80;
    let lms = 75;
    let coding = 65;
    let aptitude = 65;

    if (isHighPerformer) {
      cgpa = +(8.4 + (idx % 10) * 0.14).toFixed(1);
      attendance = 88 + (idx % 10);
      lms = 85 + (idx % 12);
      coding = 80 + (idx % 15);
      aptitude = 82 + (idx % 12);
    } else if (isAcademicOnly) {
      cgpa = +(8.2 + (idx % 8) * 0.12).toFixed(1);
      attendance = 85 + (idx % 8);
      lms = 82 + (idx % 10);
      coding = 42 + (idx % 12);
      aptitude = 48 + (idx % 10);
    } else if (isTechCoder) {
      cgpa = +(6.1 + (idx % 5) * 0.15).toFixed(1);
      attendance = 68 + (idx % 8);
      lms = 65 + (idx % 8);
      coding = 84 + (idx % 12);
      aptitude = 80 + (idx % 10);
      backlogs = idx % 2 === 0 ? 1 : 0;
    } else {
      cgpa = +(5.2 + (idx % 8) * 0.15).toFixed(1);
      attendance = 58 + (idx % 14);
      lms = 42 + (idx % 15);
      coding = 35 + (idx % 15);
      aptitude = 40 + (idx % 15);
      backlogs = 1 + (idx % 3);
    }

    rawList.push({
      id: `st-${idx + 11}`,
      name,
      rollNumber: `CS21-${120 + idx}`,
      department: departments[idx % departments.length],
      semester: 7,
      email: `${name.toLowerCase().replace(' ', '.')}@campus.edu`,
      cgpa,
      backlogs,
      internalMarks: Math.round(cgpa * 9.5),
      attendancePercentage: Math.min(100, attendance),
      lmsCompletionRate: Math.min(100, lms),
      lmsLoginFrequency: Math.round(lms / 8),
      aptitudeScore: Math.min(100, aptitude),
      codingScore: Math.min(100, coding),
      mockInterviewScore: Math.min(100, Math.round((aptitude + coding) / 2)),
      technicalAssessment: Math.min(100, coding),
      certificationsCount: isHighPerformer ? 3 : isTechCoder ? 2 : 0,
      hackathonParticipation: isTechCoder ? 3 : isHighPerformer ? 2 : 0,
    });
  });

  return rawList.map((st) => {
    const metrics = calculateStudentMetrics(st);
    const softSkillScore = Math.min(100, Math.round((st.mockInterviewScore || 65) * 0.85 + 12));
    const studentSatisfaction = Math.min(5.0, +(3.2 + (st.cgpa / 10) * 1.6).toFixed(1));
    const clubsEvents =
      st.hackathonParticipation > 1
        ? 'ACM Chapter, Coding Club'
        : st.hackathonParticipation === 1
        ? 'Robotics Society, Tech Fest'
        : 'Cultural Club, Literary Society';
    const facultyFeedback =
      st.backlogs > 0
        ? `Active backlog risk in ${st.backlogs} core course(s). Requires faculty remedial coaching and lab makeup sessions.`
        : st.attendancePercentage < 75
        ? `Attendance at ${st.attendancePercentage}% is below the 75% university eligibility cutoff. Attendance counseling recommended.`
        : st.codingScore < 50
        ? 'Excellent academic discipline and exam grades, but requires hands-on technical coding and interview practice.'
        : 'Proactive learner with exemplary classroom participation and strong collaborative project leadership.';

    return {
      ...st,
      softSkillScore,
      studentSatisfaction,
      clubsEvents,
      facultyFeedback,
      ...metrics,
    };
  });
}

export function generateBenchmarkInterventions(): Intervention[] {
  return [
    {
      id: 'int-01',
      studentId: 'st-04',
      studentName: 'Ananya Iyer',
      department: 'Electronics & Comm.',
      type: 'Academic Remedial',
      assignedTo: 'Prof. R. Sharma (HOD ECE)',
      date: '14 Oct 2026',
      status: 'Scheduled',
      notes: 'Remedial coaching for 2 active backlogs in Signals & Systems. Bi-weekly attendance check-in.',
    },
    {
      id: 'int-02',
      studentId: 'st-02',
      studentName: 'Diya Patel',
      department: 'Information Technology',
      type: 'Coding Bootcamp',
      assignedTo: 'Placement Cell - Tech Track',
      date: '12 Oct 2026',
      status: 'In Progress',
      notes: 'High CGPA (8.8) but low coding readiness (48%). Enrolled in 4-week Data Structures sprint.',
    },
    {
      id: 'int-03',
      studentId: 'st-07',
      studentName: 'Kabir Mehta',
      department: 'Mechanical Eng.',
      type: 'Attendance Counseling',
      assignedTo: 'Student Welfare Dean',
      date: '10 Oct 2026',
      status: 'In Progress',
      notes: 'Critical attendance at 61%. Parent-faculty counseling completed. Warning issued.',
    },
    {
      id: 'int-04',
      studentId: 'st-03',
      studentName: 'Rohan Verma',
      department: 'Computer Science',
      type: 'Faculty Mentorship',
      assignedTo: 'Dr. S. Nair',
      date: '08 Oct 2026',
      status: 'Completed',
      notes: 'Excellent coding acumen (94%). Mentored to clear 1 backlog and keep attendance above 75%.',
    },
  ];
}

export function loadSavedStudents(): StudentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STUDENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStudents(students: StudentRecord[]): void {
  localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
}

export function loadSavedInterventions(): Intervention[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INTERVENTIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveInterventions(interventions: Intervention[]): void {
  localStorage.setItem(STORAGE_KEY_INTERVENTIONS, JSON.stringify(interventions));
}
