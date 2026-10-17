import { useState, type DragEvent } from 'react';
import { X, UploadCloud, Sparkles, CheckCircle2, AlertCircle, FileText, Loader2, Download } from 'lucide-react';
import type { StudentRecord } from '@/types';
import { calculateStudentMetrics, generateBenchmarkStudents } from '@/lib/studentData';
import { importStudentTemplateRecords, uploadStudentDataFile, reloadBenchmarkFromBackend } from '@/lib/api';
import {
  downloadStudentTemplate,
  parseStudentTemplateFile,
  type StudentTemplateError,
  type StudentTemplateRecord,
} from '@/lib/studentTemplate';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (students: StudentRecord[]) => void;
}

function isSupportedFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase().split(';')[0].trim();
  return (
    extension === 'csv' ||
    extension === 'xlsx' ||
    extension === 'xls' ||
    extension === 'json' ||
    extension === 'pdf' ||
    mimeType === 'application/pdf' ||
    ['text/csv', 'application/csv', 'text/plain', 'application/json'].includes(mimeType)
  );
}

const studentFieldAliases = {
  id: ['id', 'studentid', 'studentnumber', 'rollnumber', 'rollno', 'roll'],
  name: ['name', 'studentname', 'fullname', 'student'],
  department: ['department', 'dept', 'program'],
  semester: ['semester', 'sem', 'term', 'year'],
  cgpa: ['cgpa', 'gpa'],
  backlogs: ['backlogs', 'backlog', 'activebacklogs'],
  internalMarks: ['internalmarks', 'internalmark'],
  attendancePercentage: ['attendancepercentage', 'attendance', 'attendancepercent'],
  lmsCompletionRate: ['lmscompletionrate', 'lmscompletion', 'completionrate'],
  lmsLoginFrequency: ['lmsloginfrequency', 'lmslogins', 'logins', 'loginfrequency', 'logincount', 'lmsactivity', 'lmsactivitypercent'],
  assignmentsLate: ['assignmentslate', 'lateassignments', 'latesubmissions', 'late'],
  certificationsCount: ['certificationscount', 'certifications'],
  hackathonParticipation: ['hackathonparticipation', 'hackathons'],
  aptitudeScore: ['aptitudescore', 'aptitude'],
  codingScore: ['codingscore', 'coding', 'technicalassessment', 'technical_skill_score'],
  mockInterviewScore: ['mockinterviewscore', 'mockinterview', 'placementmockscore'],
  softSkillScore: ['softskillscore', 'softskills'],
  studentSatisfaction: ['studentsatisfaction', 'satisfaction'],
  placementStatus: ['placementstatus'],
} as const;

type StudentField = keyof typeof studentFieldAliases;

interface PdfTextCell {
  x: number;
  text: string;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getFieldForHeader(header: string): StudentField | undefined {
  const normalized = normalizeHeader(header);
  return (Object.keys(studentFieldAliases) as StudentField[]).find((field) =>
    (studentFieldAliases[field] as readonly string[]).some(
      (alias) => normalizeHeader(alias) === normalized,
    ),
  );
}

function readPdfNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/[%$,]/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function createStudentRecord(
  values: Partial<Record<StudentField, string>>,
  index: number,
): StudentRecord {
  const id = values.id?.trim() || `PDF-STU-${index + 1}`;
  const name = values.name?.trim() || `Student ${index + 1}`;
  const cgpa = readPdfNumber(values.cgpa);
  const backlogs = readPdfNumber(values.backlogs);
  const internalMarks = readPdfNumber(values.internalMarks);
  const attendancePercentage = readPdfNumber(values.attendancePercentage);
  const lmsCompletionRate = readPdfNumber(values.lmsCompletionRate);
  const aptitudeScore = readPdfNumber(values.aptitudeScore);
  const codingScore = readPdfNumber(values.codingScore);
  const mockInterviewScore = readPdfNumber(values.mockInterviewScore);

  return {
    id,
    name,
    rollNumber: values.id?.trim() || id,
    department: values.department?.trim() || 'Unassigned',
    semester: readPdfNumber(values.semester),
    email: '',
    cgpa,
    backlogs,
    internalMarks,
    attendancePercentage,
    assignmentsLate: readPdfNumber(values.assignmentsLate),
    lmsCompletionRate,
    lmsLoginFrequency: readPdfNumber(values.lmsLoginFrequency),
    certificationsCount: readPdfNumber(values.certificationsCount),
    hackathonParticipation: readPdfNumber(values.hackathonParticipation),
    clubsEvents: '',
    aptitudeScore,
    codingScore,
    mockInterviewScore,
    technicalAssessment: codingScore,
    softSkillScore: readPdfNumber(values.softSkillScore),
    facultyFeedback: '',
    studentSatisfaction: readPdfNumber(values.studentSatisfaction),
    placementStatus: values.placementStatus?.trim() || null,
    ...calculateStudentMetrics({
      cgpa,
      backlogs,
      internalMarks,
      attendancePercentage,
      assignmentsLate: readPdfNumber(values.assignmentsLate),
      lmsCompletionRate,
      lmsLoginFrequency: readPdfNumber(values.lmsLoginFrequency),
      aptitudeScore,
      codingScore,
      mockInterviewScore,
    }),
  };
}

async function extractPdfStudentRecords(file: File): Promise<StudentRecord[]> {
  const [pdfjsLib, pdfWorker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker.default;
  const task = pdfjsLib.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });

  try {
    const document = await task.promise;
    const students: StudentRecord[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const lineMap = new Map<number, PdfTextCell[]>();

      for (const item of content.items) {
        if (!('str' in item) || !item.str.trim()) continue;
        const x = item.transform[4];
        const y = Math.round(item.transform[5] / 3) * 3;
        const line = lineMap.get(y) ?? [];
        line.push({ x, text: item.str.trim() });
        lineMap.set(y, line);
      }

      const lines = [...lineMap.entries()]
        .sort(([leftY], [rightY]) => rightY - leftY)
        .map(([, cells]) => cells.sort((left, right) => left.x - right.x));

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const headerCells = lines[lineIndex];
        const headerFields = headerCells.map((cell) => getFieldForHeader(cell.text));
        if (headerFields.filter(Boolean).length < 2) continue;

        const columnBounds = headerCells.map((cell, index) => ({
          x: cell.x,
          field: headerFields[index],
          nextX: headerCells[index + 1]?.x ?? Number.POSITIVE_INFINITY,
        }));

        for (let rowIndex = lineIndex + 1; rowIndex < lines.length; rowIndex += 1) {
          const row = lines[rowIndex];
          if (row.filter((cell) => getFieldForHeader(cell.text)).length >= 2) break;

          const values: Partial<Record<StudentField, string>> = {};
          for (const cell of row) {
            const columnIndex = columnBounds.findIndex(
              (column, index) =>
                cell.x < (column.x + (columnBounds[index + 1]?.x ?? column.nextX)) / 2,
            );
            const field = columnBounds[columnIndex]?.field;
            if (field) values[field] = [values[field], cell.text].filter(Boolean).join(' ');
          }

          const hasStudentIdentity = Boolean(values.name || values.id);
          const hasStudentMetric = [
            values.cgpa,
            values.attendancePercentage,
            values.backlogs,
            values.codingScore,
            values.aptitudeScore,
          ].some((value) => value !== undefined);
          if (hasStudentIdentity && hasStudentMetric) {
            students.push(createStudentRecord(values, students.length));
          }
        }
      }
    }
    if (students.length === 0) {
      throw new Error(
        'No student rows were found. Use a text-based PDF with a table containing student names or IDs and recognizable column headers.',
      );
    }
    return students;
  } finally {
    await task.destroy();
  }
}

export default function UploadModal({ isOpen, onClose, onDataLoaded }: UploadModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [templateErrors, setTemplateErrors] = useState<StudentTemplateError[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!isOpen) return null;

  async function handleLoadBenchmark() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const backendStudents = await reloadBenchmarkFromBackend();
      const students = backendStudents && backendStudents.length > 0
        ? backendStudents
        : generateBenchmarkStudents();
      onDataLoaded(students);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 700);
    } catch {
      const fallback = generateBenchmarkStudents();
      onDataLoaded(fallback);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 700);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(file: File) {
    if (loading || success) return;
    if (!isSupportedFile(file)) {
      setErrorMessage('Choose a CSV, JSON, or PDF file to upload.');
      return;
    }

    setSelectedFile(file);
    setLoading(true);
    setErrorMessage(null);
    setTemplateErrors([]);
    try {
      const isPdf =
        file.name.split('.').pop()?.toLowerCase() === 'pdf' ||
        file.type.toLowerCase().split(';')[0].trim() === 'application/pdf';
      const extension = file.name.split('.').pop()?.toLowerCase();
      let students: StudentRecord[];
      if (extension === 'csv' || extension === 'xlsx' || extension === 'xls') {
        const { records, errors } = await parseStudentTemplateFile(file);
        if (errors.length > 0) {
          setTemplateErrors(errors);
          return;
        }
        students = await importStudentTemplateRecords(records);
      } else if (isPdf) {
        const parsedStudents = await extractPdfStudentRecords(file);
        const records: StudentTemplateRecord[] = parsedStudents.map((student) => ({
          student_id: student.id,
          name: student.name,
          department: student.department,
          semester: student.semester,
          cgpa: student.cgpa,
          attendance_percent: student.attendancePercentage,
          lms_logins: student.lmsLoginFrequency,
          late_assignments: student.assignmentsLate ?? null,
          coding_score: student.codingScore,
          placement_status: student.placementStatus ?? null,
        }));
        students = await importStudentTemplateRecords(records);
      } else {
        students = (await uploadStudentDataFile(file)).students;
      }
      onDataLoaded(students);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) void handleFileUpload(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-indigo-500/20 bg-[#0f172a] p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Upload Campus Data</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Integrate academic, attendance, LMS, and placement records.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="my-6">
          {/* Quick Benchmark Button */}
          <div className="mb-4 p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/30">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-indigo-200">KPMG Benchmark Dataset</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pre-compiled realistic dataset with 5 departments, dual-risk flags, and segmentations.
                </p>
                <button
                  type="button"
                  onClick={handleLoadBenchmark}
                  disabled={loading || success}
                  className="mt-3 flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
                >
                  {success ? (
                    <>
                      <CheckCircle2 size={14} className="text-emerald-300" />
                      <span>Data Loaded Successfully!</span>
                    </>
                  ) : loading ? (
                    <span>Integrating Data...</span>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Load Full Benchmark Dataset</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
          {templateErrors.length > 0 && (
            <div className="mb-4 max-h-40 overflow-y-auto rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
              <p className="mb-2 font-semibold">Fix these row errors before importing:</p>
              <ul className="space-y-1">
                {templateErrors.map((error, index) => (
                  <li key={`${error.row}-${error.field}-${index}`}>
                    Row {error.row} · {error.field}: {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Drag & drop file area */}
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-2xl p-8 text-center bg-slate-900/40 transition-colors cursor-pointer"
          >
            <UploadCloud size={32} className="mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-semibold text-slate-300">
              Drag and drop student CSV / JSON / PDF file
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              CSV and Excel use the fixed template; JSON and PDF keep the existing import flow.
            </p>
            <button
              type="button"
              onClick={downloadStudentTemplate}
              disabled={loading || success}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-50"
            >
              <Download size={14} />
              Download template
            </button>
            <label className="mt-3 inline-block">
              <span className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer border border-slate-700">
                Browse Files
              </span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.json,.pdf,text/csv,application/csv,text/plain,application/json,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFileUpload(file);
                  event.target.value = '';
                }}
              />
            </label>
            {loading && selectedFile && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-2 text-left">
                <FileText size={18} className="shrink-0 text-indigo-300" />
                <span className="min-w-0 flex-1 truncate text-xs text-slate-200">
                  {selectedFile.name.toLowerCase().endsWith('.pdf') ? 'Parsing' : 'Uploading'}{' '}
                  {selectedFile.name}
                </span>
                <Loader2 size={16} className="shrink-0 animate-spin text-indigo-300" />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
