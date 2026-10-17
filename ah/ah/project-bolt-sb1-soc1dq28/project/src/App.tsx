import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import UploadModal from '@/components/UploadModal';
import DataSchemaModal from '@/components/DataSchemaModal';
import AddInterventionModal from '@/components/AddInterventionModal';
import ChatbotWidget from '@/components/ChatbotWidget';
import Dashboard, { type CampusRole, type UserAccount } from '@/views/Dashboard';
import { getSessionUser, setSessionUser } from '@/lib/auth';
import {
  fetchStudentsFromBackend,
  fetchBackendInterventions,
  reloadBenchmarkFromBackend,
  createBackendIntervention,
} from '@/lib/api';
import Overview from '@/views/Overview';
import Students from '@/views/Students';
import RiskAnalysis from '@/views/RiskAnalysis';
import Segments from '@/views/Segments';
import InterventionsView from '@/views/Interventions';
import LLMInsights from '@/views/LLMInsights';
import LMSEngagement from '@/views/LMSEngagement';
import PitchDeck from '@/views/PitchDeck';
import type { ViewKey, StudentRecord, Intervention } from '@/types';
import {
  calculateStudentMetrics,
  generateBenchmarkInterventions,
  generateBenchmarkStudents,
  loadSavedInterventions,
  loadSavedStudents,
  saveInterventions,
  saveStudents,
} from '@/lib/studentData';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    if (record[key] === undefined) continue;
    if (typeof record[key] !== 'string') throw new Error(`Student field "${key}" must be text.`);
    return record[key];
  }
  return undefined;
}

/** Safely map a raw backend record (snake_case) into a full StudentRecord. */
function normalizeBackendStudent(rawValue: unknown): StudentRecord {
  if (!isRecord(rawValue)) {
    throw new Error('The backend returned a student record with an invalid structure.');
  }
  const raw = rawValue;
  const n = (keys: string[], fallback: number | null = null): number | null => {
    for (const k of keys) {
      const value = raw[k];
      if (value === null || value === undefined || value === '') continue;
      const parsed = typeof value === 'number' ? value : Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  };
  const s = (keys: string[], fallback = ''): string => {
    for (const k of keys) {
      if (typeof raw[k] === 'string') return raw[k] as string;
    }
    return fallback;
  };
  const id            = s(['id', 'student_id'], `STU${Math.random().toString(36).slice(2, 8)}`);
  const cgpa          = n(['cgpa']);
  const backlogs      = n(['backlogs']);
  const internalMarks = n(['internalMarks', 'internal_marks']);
  const attendancePct = n(['attendancePercentage', 'attendance_percentage', 'attendance']);
  const lmsCR         = n(['lmsCompletionRate', 'lms_completion_rate']);
  const aptitude      = n(['aptitudeScore', 'aptitude_score']);
  const coding        = n(['codingScore', 'coding_score', 'technical_skill_score']);
  const mockScore     = n(['mockInterviewScore', 'mock_interview_score', 'placement_mock_score']);

  const normalized: StudentRecord = {
    id,
    name:                  s(['name', 'student_name'], id),
    rollNumber:            s(['rollNumber', 'roll_number', 'student_id'], id),
    department:            s(['department', 'dept'], 'Unassigned'),
    semester:              n(['semester']),
    email:                 s(['email'], ''),
    cgpa,
    backlogs,
    internalMarks,
    attendancePercentage:  attendancePct,
    assignmentsLate:       n(['assignmentsLate', 'assignments_late']),
    lmsCompletionRate:     lmsCR,
    lmsLoginFrequency:     n(['lmsLoginFrequency', 'lms_login_frequency', 'lms_logins']),
    certificationsCount:   n(['certificationsCount', 'certifications_count']),
    hackathonParticipation: n(['hackathonParticipation', 'hackathon_participation']),
    clubsEvents:           s(['clubsEvents', 'clubs_events'], ''),
    aptitudeScore:         aptitude,
    codingScore:           coding,
    mockInterviewScore:    mockScore,
    technicalAssessment:   n(['technicalAssessment', 'technical_assessment'], coding),
    softSkillScore:        n(['softSkillScore', 'soft_skill_score']),
    facultyFeedback:       s(['facultyFeedback', 'faculty_feedback'], ''),
    studentSatisfaction:   n(['studentSatisfaction', 'student_satisfaction']),
    placementStatus:       s(['placementStatus', 'placement_status']) || null,
    academicScore: null,
    placementScore: null,
    successScore: null,
    riskCategory: 'Unknown',
    riskReasons: [],
    academicRisk: null,
    placementRisk: null,
    segment: 'Unknown',
    keyDrivers: { positive: [], negative: [] },
  };
  return { ...normalized, ...calculateStudentMetrics(normalized) };
}

function recalculateRoster(records: StudentRecord[]): StudentRecord[] {
  const isLegacyPdfImport =
    records.length >= 5 &&
    records.every(
      (student) =>
        student.aptitudeScore === null &&
        student.mockInterviewScore === 0 &&
        student.lmsCompletionRate === null &&
        student.assignmentsLate !== null &&
        student.codingScore !== null &&
        student.lmsLoginFrequency !== null,
    );

  return records.map((student) => {
    // Older PDF imports synthesized zero interview scores and estimated late assignments.
    const source = isLegacyPdfImport
      ? { ...student, mockInterviewScore: null, assignmentsLate: null }
      : student;
    return { ...source, ...calculateStudentMetrics(source) };
  });
}


export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<CampusRole>('Admin');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [view, setView] = useState<ViewKey>('overview');
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [llmInsight, setLlmInsight] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [interventionOpen, setInterventionOpen] = useState(false);

  useEffect(() => {
    // Validate saved students have required fields (guards against stale snake_case data)
    const savedStudents = loadSavedStudents().filter(
      (s): s is StudentRecord =>
        isRecord(s) && typeof s.id === 'string' && typeof s.rollNumber === 'string',
    );
    const savedInterventions = loadSavedInterventions();
    if (savedStudents.length) {
      const normalized = recalculateRoster(savedStudents.map(normalizeBackendStudent));
      setStudents(normalized);
      saveStudents(normalized);
    }
    if (savedInterventions.length) setInterventions(savedInterventions);

    // Sync with backend API — normalize snake_case → camelCase
    fetchStudentsFromBackend().then((apiStudents) => {
      if (apiStudents && apiStudents.length > 0) {
        const normalized = (apiStudents as unknown[])
          .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
          .map(normalizeBackendStudent);
        const recalculated = recalculateRoster(normalized);
        setStudents(recalculated);
        saveStudents(recalculated);
      }
    });

    fetchBackendInterventions().then((apiInterventions) => {
      if (apiInterventions && apiInterventions.length > 0) {
        setInterventions(apiInterventions);
        saveInterventions(apiInterventions);
      }
    });

    const session = getSessionUser();
    if (session) {
      setCurrentUser(session);
      setUserRole(session.role);
      setIsAuthenticated(true);
    }
  }, []);


  function handleLogin(role: CampusRole, user?: UserAccount) {
    setUserRole(role);
    if (user) {
      setCurrentUser(user);
    }
    setView('overview');
    setIsAuthenticated(true);
  }

  function handleLogout() {
    setSessionUser(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
  }

  function handleDataLoaded(loadedStudents: StudentRecord[]) {
    const normalized = loadedStudents.map(normalizeBackendStudent);
    setStudents(normalized);
    saveStudents(normalized);
    const benchmarkInterventions = generateBenchmarkInterventions();
    setInterventions(benchmarkInterventions);
    saveInterventions(benchmarkInterventions);
  }

  async function handleLoadBenchmark() {
    try {
      const apiStudents = await reloadBenchmarkFromBackend();
      if (apiStudents && apiStudents.length > 0) {
        handleDataLoaded(apiStudents);
        return;
      }
    } catch {
      // Fallback
    }
    handleDataLoaded(generateBenchmarkStudents());
  }

  function handleResetData() {
    setStudents([]);
    saveStudents([]);
    setInterventions([]);
    saveInterventions([]);
  }

  function handleAddIntervention(intervention: Intervention) {
    const updated = [intervention, ...interventions];
    setInterventions(updated);
    saveInterventions(updated);
    createBackendIntervention(intervention).catch(() => {});
  }

  function handleNaturalEntryResult(records: unknown[]): number {
    if (!records.every(isRecord)) {
      throw new Error('Natural-entry response contains an invalid student record.');
    }

    const mappedStudents = records.map((record): StudentRecord => {
      const id = readString(record, ['id', 'student_id', 'studentId']);
      if (!id) throw new Error('A student record is missing its ID.');
      return normalizeBackendStudent(record);
    });

    setStudents(mappedStudents);
    saveStudents(mappedStudents);
    return mappedStudents.length;
  }

  if (!isAuthenticated) {
    return <Dashboard onLogin={handleLogin} />;
  }

  const allowedViews: ViewKey[] =
    userRole === 'Teacher'
      ? ['overview', 'lms-engagement', 'risk-analysis']
      : userRole === 'Student'
        ? ['overview']
      : [
          'overview',
          'students',
          'risk-analysis',
          'segments',
          'interventions',
          'llm-insights',
          'lms-engagement',
          'pitch-deck',
        ];
  const filteredStudents =
    userRole === 'Student'
      ? students.filter((student) => {
          const studentId =
            typeof currentUser?.studentId === 'string' ? currentUser.studentId.toUpperCase() : '';
          const matchesId = (value: unknown, target: string) =>
            typeof value === 'string' && value.toUpperCase().includes(target);

          if (
            studentId &&
            (matchesId(student.id, studentId) || matchesId(student.rollNumber, studentId))
          ) {
            return true;
          }
          return (
            matchesId(student.id, 'STU1001') || matchesId(student.rollNumber, 'STU1001')
          );
        })
      : students;

  const visibleStudents =
    userRole === 'Student' && filteredStudents.length === 0 && students.length > 0
      ? students.slice(0, 1)
      : filteredStudents;

  return (
    <div className="flex min-h-screen w-full bg-[#0b0f19] font-sans text-slate-100">
      <Sidebar
        active={view}
        onNavigate={setView}
        onOpenUpload={() => setUploadOpen(true)}
        onOpenSchema={() => setSchemaOpen(true)}
        allowedViews={allowedViews}
      />
      <div className="flex min-w-0 flex-1 flex-col bg-[#0b0f19]">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          hasData={visibleStudents.length > 0}
          onLoadBenchmark={handleLoadBenchmark}
          onResetData={handleResetData}
          onOpenUpload={() => setUploadOpen(true)}
          onLogout={handleLogout}
          userRole={userRole}
          currentUser={currentUser}
        />

        <main className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto p-6 md:p-8">
          {view === 'overview' && (
            <Overview
              students={visibleStudents}
              interventions={interventions}
              onNavigate={setView}
              onOpenUpload={() => setUploadOpen(true)}
              onOpenSchema={() => setSchemaOpen(true)}
              onOpenAddIntervention={() => setInterventionOpen(true)}
              onApplyNaturalEntry={handleNaturalEntryResult}
              userRole={userRole}
            />
          )}
          {view === 'students' && <Students students={visibleStudents} searchQuery={searchQuery} />}
          {view === 'risk-analysis' && (
            <RiskAnalysis
              students={visibleStudents}
              onOpenAddIntervention={() => setInterventionOpen(true)}
            />
          )}
          {view === 'segments' && <Segments students={visibleStudents} />}
          {view === 'interventions' && (
            <InterventionsView
              interventions={interventions}
              onOpenAdd={() => setInterventionOpen(true)}
            />
          )}
          {view === 'llm-insights' && (
            <LLMInsights students={visibleStudents} llmInsight={llmInsight} />
          )}
          {view === 'pitch-deck' && <PitchDeck />}
          {view === 'lms-engagement' && (
            <LMSEngagement onLlmInsight={setLlmInsight} />
          )}
          {view === 'reports' && (
            <div className="rounded-2xl border border-slate-800 bg-[#111827] p-8 text-center">
              <h3 className="text-base font-bold text-white">Institutional Reports</h3>
              <p className="mt-1 text-xs text-slate-400">
                Semester outcome summary and placement eligibility audit reports.
              </p>
              <button
                onClick={() => setView('overview')}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
              >
                Return to Overview
              </button>
            </div>
          )}
        </main>
      </div>

      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onDataLoaded={handleDataLoaded}
      />
      <DataSchemaModal isOpen={schemaOpen} onClose={() => setSchemaOpen(false)} />
      <AddInterventionModal
        isOpen={interventionOpen}
        onClose={() => setInterventionOpen(false)}
        students={visibleStudents}
        onAdd={handleAddIntervention}
      />
      <ChatbotWidget students={visibleStudents} />
    </div>
  );
}
