import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, RefreshCw, Upload } from 'lucide-react';
import { uploadStudentDataFile, uploadStudentDataRecords } from '@/lib/api';
import riskConfig from '../../../../../risk_config.json';

interface LMSStudent {
  student_id: string;
  name: string;
  cgpa: number | null;
  backlogs: number | null;
  attendance: number | null;
  lms_logins: number | null;
  assignments_late: number | null;
  placement_mock_score: number | null;
  technical_skill_score: number | null;
  student_satisfaction: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = readNullableNumber(value);
  return parsed ?? fallback;
}

function readNullableNumber(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value.replace(/,/g, '').trim())
        : value === null || value === undefined
          ? Number.NaN
          : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const riskThresholds = riskConfig.riskThresholds;

function isWatchlistStudent(student: LMSStudent): boolean {
  return (
    (student.lms_logins !== null &&
      student.lms_logins < riskThresholds.lmsLoginsBelow) ||
    (student.assignments_late !== null &&
      student.assignments_late > riskThresholds.lateAssignmentsAbove)
  );
}

function isOnTrackStudent(student: LMSStudent): boolean {
  const hasKnownMetrics =
    student.lms_logins !== null || student.assignments_late !== null;
  return hasKnownMetrics && !isWatchlistStudent(student);
}

function readImportedValue(record: unknown, aliases: string[]): unknown {
  if (!isRecord(record)) return undefined;
  const normalizedRecord = new Map(
    Object.entries(record).map(([key, value]) => [
      key.toLowerCase().replace(/[^a-z0-9]/g, ''),
      value,
    ]),
  );
  for (const alias of aliases) {
    const value = normalizedRecord.get(alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function readImportedString(record: unknown, aliases: string[], fallback: string): string {
  const value = readImportedValue(record, aliases);
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : typeof value === 'number' && Number.isFinite(value)
      ? String(value)
      : fallback;
}

function parseCsvRows(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  if (rows.length < 2) {
    throw new Error('The CSV must include a header row and at least one student record.');
  }

  const headers = rows[0].map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim(),
  );
  if (headers.some((header) => header === '')) {
    throw new Error('The CSV contains an empty column heading. Please name each column and retry.');
  }

  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ''])),
  );
}

function assessCsvStudents(text: string): LMSStudent[] {
  return assessImportedRows(parseCsvRows(text));
}

function assessImportedRows(rows: Record<string, string>[]): LMSStudent[] {
  return rows.map((row, index) => {
    const cgpa = readNullableNumber(readImportedValue(row, ['cgpa', 'gpa']));
    const backlogs = readNullableNumber(
      readImportedValue(row, ['backlogs', 'backlog', 'active backlogs']),
    );
    const attendance = readNullableNumber(
      readImportedValue(row, ['attendancePercentage', 'attendance_percentage', 'attendance']),
    );
    const lmsLogins = readNullableNumber(
      readImportedValue(row, [
        'lmsLoginFrequency',
        'lms_logins',
        'logins',
        'loginFrequency',
        'loginCount',
        'login_count',
        'LMS Logins',
        'LMS Activity %',
      ]),
    );
    const lateAssignments = readNullableNumber(
      readImportedValue(row, [
        'assignmentsLate',
        'assignments_late',
        'lateAssignments',
        'lateSubmissions',
        'late',
      ]),
    );
    const codingScore = readNullableNumber(
      readImportedValue(row, ['codingScore', 'coding_score', 'technical_skill_score']),
    );
    const mockScore = readNullableNumber(
      readImportedValue(row, [
        'mockInterviewScore',
        'mock_interview_score',
        'placement_mock_score',
      ]),
    );
    return {
      student_id: readImportedString(
        row,
        ['id', 'student_id', 'studentId', 'student number', 'rollNumber', 'roll_number', 'roll no'],
        `STU${index + 1}`,
      ),
      name: readImportedString(
        row,
        ['name', 'student_name', 'studentName', 'full name', 'student'],
        `Student ${index + 1}`,
      ),
      cgpa,
      backlogs,
      attendance,
      lms_logins: lmsLogins,
      assignments_late: lateAssignments,
      placement_mock_score: mockScore,
      technical_skill_score: codingScore,
      student_satisfaction: readFiniteNumber(
        readImportedValue(row, ['studentSatisfaction', 'student_satisfaction']),
        4,
      ),
    };
  });
}

const pdfColumnAliases = {
  name: ['name', 'studentname', 'fullname', 'student'],
  logins: [
    'logins',
    'lmslogins',
    'loginfrequency',
    'cohortloginfrequency',
    'lmsloginfrequency',
    'logincount',
  ],
  lateAssignments: [
    'lateassignments',
    'assignmentslate',
    'misseddeadlines',
    'latesubmissions',
    'late',
  ],
} as const;

type PdfColumn = keyof typeof pdfColumnAliases;

interface PdfTextItem {
  x: number;
  y: number;
  width: number;
  text: string;
}

function normalizePdfHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function identifyPdfColumn(value: string): PdfColumn | undefined {
  const normalized = normalizePdfHeader(value);
  return (Object.keys(pdfColumnAliases) as PdfColumn[]).find((column) =>
    (pdfColumnAliases[column] as readonly string[]).includes(normalized),
  );
}

function parsePdfStudentTextLines(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const numericValue = '([-+]?[\\d,]+(?:\\.\\d+)?)';
  const labelledRowPattern = new RegExp(
    `^(.+?)\\s+(?:(?:lms|cohort)\\s+)?(?:login\\s+frequency|login\\s+count|logins?)\\s*[:=]?\\s*${numericValue}[\\s,;|]+(?:(?:late\\s+assignments?|missed\\s+deadlines?|late\\s+submissions?)\\s*[:=]?\\s*${numericValue})$`,
    'i',
  );
  const rows: Record<string, string>[] = [];
  const campusRecordPattern =
    /^([A-Z][A-Z0-9_-]*\d[A-Z0-9_-]*)\s+(.+?)\s+([A-Z][A-Z0-9&.-]*)\s+(\d+)\s+([-+]?\d+(?:\.\d+)?)\s+([-+]?\d+(?:\.\d+)?)\s+([-+]?\d+(?:\.\d+)?)\s+([-+]?\d+(?:\.\d+)?)\s+(.+)$/i;

  for (const line of lines) {
    const campusMatch = line.match(campusRecordPattern);
    if (!campusMatch) continue;

    const attendance = readNullableNumber(campusMatch[6]);
    // LMS Activity % is used as a proxy login count; attendance estimates missed assignments when no such column exists.
    const estimatedLateAssignments =
      attendance === null
        ? null
        : Math.max(
            0,
            Math.ceil(
              (riskThresholds.attendancePercentBelow -
                Math.min(100, Math.max(0, attendance))) /
                10,
            ),
          );
    rows.push({
      student_id: campusMatch[1],
      name: campusMatch[2].trim(),
      department: campusMatch[3],
      semester: campusMatch[4],
      cgpa: campusMatch[5],
      attendance: attendance === null ? '' : String(attendance),
      lms_logins: campusMatch[7],
      assignments_late:
        estimatedLateAssignments === null ? '' : String(estimatedLateAssignments),
      technical_skill_score: campusMatch[8],
      placement_status: campusMatch[9].trim(),
    });
  }

  const normalizedText = normalizePdfHeader(lines.join(' '));
  const hasRelevantHeaders =
    (normalizedText.includes('name') || normalizedText.includes('student')) &&
    (normalizedText.includes('login') || normalizedText.includes('logins')) &&
    (normalizedText.includes('lateassignment') ||
      normalizedText.includes('misseddeadline') ||
      normalizedText.includes('latesubmission'));

  for (let start = 0; start < lines.length; start += 1) {
    for (let lineCount = 1; lineCount <= 4 && start + lineCount <= lines.length; lineCount += 1) {
      const candidate = lines
        .slice(start, start + lineCount)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      const labelledMatch = candidate.match(labelledRowPattern);
      if (labelledMatch) {
        const name = labelledMatch[1]
          .replace(/^(?:student\s+)?name\s*[:=]\s*/i, '')
          .trim();
        if (/[a-z]/i.test(name)) {
          rows.push({
            name,
            logins: labelledMatch[2],
            lateAssignments: labelledMatch[3],
          });
        }
        break;
      }

      if (!hasRelevantHeaders) continue;
      const numericTokens = [...candidate.matchAll(/[-+]?\d[\d,]*(?:\.\d+)?/g)];
      if (numericTokens.length < 2) continue;

      const firstNumber = numericTokens[0];
      const name = candidate
        .slice(0, firstNumber.index)
        .trim()
        .replace(/^(?:student\s+)?name\s*[:=]\s*/i, '')
        .replace(/[\s:|,-]+$/, '');
      if (/[a-z]/i.test(name)) {
        rows.push({
          name,
          logins: firstNumber[0],
          lateAssignments: numericTokens[1][0],
        });
      }
      break;
    }
  }

  const uniqueRows = new Map<string, Record<string, string>>();
  for (const row of rows) {
    const key = `${normalizePdfHeader(row.name)}:${row.logins}:${row.lateAssignments}`;
    uniqueRows.set(key, row);
  }
  return [...uniqueRows.values()];
}

async function extractPdfLmsStudents(file: File): Promise<LMSStudent[]> {
  const [pdfjsLib, pdfWorker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker.default;
  const task = pdfjsLib.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  const importedRows: Record<string, string>[] = [];

  try {
    const document = await task.promise;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const pageStartCount = importedRows.length;
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .filter((item): item is typeof item & { str: string } => 'str' in item)
        .map((item) => `${item.str}${'hasEOL' in item && item.hasEOL ? '\n' : ' '}`)
        .join('');
      const groupedLines = new Map<number, PdfTextItem[]>();

      for (const item of content.items) {
        if (!('str' in item) || !item.str.trim()) continue;
        const x = item.transform[4];
        const y = Math.round(item.transform[5] / 3) * 3;
        const line = groupedLines.get(y) ?? [];
        line.push({ x, y, width: item.width, text: item.str.trim() });
        groupedLines.set(y, line);
      }

      const lines = [...groupedLines.entries()]
        .sort(([leftY], [rightY]) => rightY - leftY)
        .map(([, items]) => items.sort((left, right) => left.x - right.x));
      const visuallyGroupedText = lines
        .map((line) => line.map((item) => item.text).join(' '))
        .join('\n');

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const headerItems = lines[lineIndex];
        const headerGroups: { x: number; text: string }[] = [];
        for (let itemIndex = 0; itemIndex < headerItems.length; itemIndex += 1) {
          const item = headerItems[itemIndex];
          const lastGroup = headerGroups[headerGroups.length - 1];
          const previousItem = headerItems[itemIndex - 1];
          if (lastGroup && previousItem && item.x - (previousItem.x + previousItem.width) < 12) {
            lastGroup.text += ` ${item.text}`;
          } else {
            headerGroups.push({ x: item.x, text: item.text });
          }
        }

        const columns = headerGroups.map((group) => ({
          ...group,
          column: identifyPdfColumn(group.text),
        }));
        const hasName = columns.some(({ column }) => column === 'name');
        const hasLogins = columns.some(({ column }) => column === 'logins');
        const hasLateAssignments = columns.some(
          ({ column }) => column === 'lateAssignments',
        );
        if (!hasName || !hasLogins || !hasLateAssignments) continue;

        for (let rowIndex = lineIndex + 1; rowIndex < lines.length; rowIndex += 1) {
          const row = lines[rowIndex];
          const normalizedRow = normalizePdfHeader(row.map((item) => item.text).join(' '));
          if (
            (normalizedRow.includes('studentname') || normalizedRow.startsWith('name')) &&
            (normalizedRow.includes('logins') || normalizedRow.includes('loginfrequency')) &&
            (normalizedRow.includes('lateassignments') ||
              normalizedRow.includes('misseddeadlines'))
          ) {
            break;
          }

          const values: Partial<Record<PdfColumn, string>> = {};
          for (const item of row) {
            const columnIndex = columns.findIndex(
              (column, index) =>
                item.x <
                (column.x + (columns[index + 1]?.x ?? Number.POSITIVE_INFINITY)) / 2,
            );
            const column = columns[columnIndex]?.column;
            if (column) {
              values[column] = [values[column], item.text].filter(Boolean).join(' ');
            }
          }

          if (values.name && values.logins !== undefined && values.lateAssignments !== undefined) {
            importedRows.push({
              name: values.name,
              logins: values.logins,
              lateAssignments: values.lateAssignments,
            });
          }
        }
      }

      if (importedRows.length === pageStartCount) {
        importedRows.push(...parsePdfStudentTextLines(`${pageText}\n${visuallyGroupedText}`));
      }
    }
  } finally {
    await task.destroy();
  }

  if (importedRows.length === 0) {
    throw new Error(
      'No LMS student rows were found. Use a text-based PDF with student names, login frequency/logins, and late assignments/missed deadlines.',
    );
  }
  return assessImportedRows(importedRows);
}

function generateMockStudents(): LMSStudent[] {
  const firstNames = [
    'Aarav', 'Diya', 'Rohan', 'Ananya', 'Vikram',
    'Sneha', 'Kabir', 'Pooja', 'Arjun', 'Ishaan',
  ];
  const lastNames = [
    'Sharma', 'Patel', 'Verma', 'Iyer', 'Sengupta',
    'Reddy', 'Mehta', 'Kulkarni', 'Nair', 'Joshi',
  ];
  const randomInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  return Array.from({ length: 100 }, (_, index) => {
    const cgpa = +(5 + Math.random() * 5).toFixed(1);
    const backlogs = randomInt(0, 3);
    const attendance = randomInt(55, 100);
    const lms_logins = randomInt(20, 100);
    const assignments_late = randomInt(0, 6);
    const placement_mock_score = randomInt(35, 100);
    const technical_skill_score = randomInt(35, 100);
    const student_satisfaction = +(1 + Math.random() * 4).toFixed(1);

    return {
      student_id: `STU-${String(index + 1).padStart(3, '0')}`,
      name: `${firstNames[Math.floor(index / lastNames.length)]} ${lastNames[index % lastNames.length]}`,
      cgpa,
      backlogs,
      attendance,
      lms_logins,
      assignments_late,
      placement_mock_score,
      technical_skill_score,
      student_satisfaction,
    };
  });
}

function EngagementChart({ students }: { students: LMSStudent[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!host || !canvas || !context) return;

    const draw = () => {
      const width = host.clientWidth;
      const height = 320;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const margin = { top: 16, right: 16, bottom: 42, left: 42 };
      const plotWidth = width - margin.left - margin.right;
      const plotHeight = height - margin.top - margin.bottom;
      const knownLogins = students
        .map((student) => student.lms_logins)
        .filter((value): value is number => value !== null);
      const knownLateAssignments = students
        .map((student) => student.assignments_late)
        .filter((value): value is number => value !== null);
      const maxLogins = Math.max(
        riskThresholds.lmsLoginsBelow,
        Math.ceil(Math.max(...knownLogins, 0) / 10) * 10,
      );
      const maxLate = Math.max(
        riskThresholds.lateAssignmentsAbove + 2,
        Math.ceil(Math.max(...knownLateAssignments, 0)),
      );
      const x = (value: number) => margin.left + (value / maxLogins) * plotWidth;
      const y = (value: number) => margin.top + plotHeight - (value / maxLate) * plotHeight;

      context.font = '11px sans-serif';
      context.textAlign = 'right';
      context.textBaseline = 'middle';
      for (let tick = 0; tick <= 4; tick += 1) {
        const value = (maxLate * tick) / 4;
        const tickY = y(value);
        context.strokeStyle = '#263244';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(margin.left, tickY);
        context.lineTo(width - margin.right, tickY);
        context.stroke();
        context.fillStyle = '#94a3b8';
        context.fillText(value.toFixed(value % 1 === 0 ? 0 : 1), margin.left - 8, tickY);
      }

      context.textAlign = 'center';
      context.textBaseline = 'top';
      for (let tick = 0; tick <= 4; tick += 1) {
        const value = (maxLogins * tick) / 4;
        const tickX = x(value);
        context.strokeStyle = '#263244';
        context.beginPath();
        context.moveTo(tickX, margin.top);
        context.lineTo(tickX, margin.top + plotHeight);
        context.stroke();
        context.fillStyle = '#94a3b8';
        context.fillText(value.toFixed(0), tickX, margin.top + plotHeight + 9);
      }

      context.save();
      context.setLineDash([5, 5]);
      context.strokeStyle = '#f59e0b';
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(x(riskThresholds.lmsLoginsBelow), margin.top);
      context.lineTo(x(riskThresholds.lmsLoginsBelow), margin.top + plotHeight);
      context.stroke();
      context.beginPath();
      context.moveTo(margin.left, y(riskThresholds.lateAssignmentsAbove));
      context.lineTo(width - margin.right, y(riskThresholds.lateAssignmentsAbove));
      context.stroke();
      context.restore();

      for (const student of students) {
        if (student.lms_logins === null || student.assignments_late === null) continue;
        const isAtRisk = isWatchlistStudent(student);
        context.beginPath();
        context.arc(x(student.lms_logins), y(student.assignments_late), isAtRisk ? 5 : 4, 0, Math.PI * 2);
        context.fillStyle = isAtRisk ? '#fb7185' : '#22d3ee';
        context.fill();
        context.strokeStyle = '#0f172a';
        context.lineWidth = 2;
        context.stroke();
      }

      context.fillStyle = '#94a3b8';
      context.textAlign = 'center';
      context.textBaseline = 'bottom';
      context.fillText('LMS logins', margin.left + plotWidth / 2, height - 2);
      context.save();
      context.translate(12, margin.top + plotHeight / 2);
      context.rotate(-Math.PI / 2);
      context.fillText('Late assignments', 0, 0);
      context.restore();
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(host);
    return () => observer.disconnect();
  }, [students]);

  if (students.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-slate-500">
        No student records to chart yet.
      </div>
    );
  }

  return (
    <div ref={hostRef} className="w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Scatter chart for ${students.length} students comparing LMS logins with late assignments. Pink points are disengagement watchlist students.`}
        className="block h-80 w-full"
      />
    </div>
  );
}

export default function LMSEngagement({
  onLlmInsight,
}: {
  onLlmInsight: (insight: string) => void;
}) {
  const [students, setStudents] = useState<LMSStudent[]>(generateMockStudents);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  async function uploadFile() {
    if (!selectedFile || uploading) return;

    setUploading(true);
    setUploadError(null);
    setUploadMessage(null);

    try {
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      const isPdf =
        extension === 'pdf' ||
        selectedFile.type.toLowerCase().split(';')[0].trim() === 'application/pdf';
      const mappedLmsStudents = isPdf
        ? await extractPdfLmsStudents(selectedFile)
        : assessCsvStudents(await selectedFile.text());
      const knownLoginValues = mappedLmsStudents
        .map((student) => student.lms_logins)
        .filter((value): value is number => value !== null);
      const averageLogins = knownLoginValues.length
        ? knownLoginValues.reduce((total, value) => total + value, 0) /
          knownLoginValues.length
        : null;
      const totalLateAssignments = mappedLmsStudents.reduce(
        (total, student) => total + (student.assignments_late ?? 0),
        0,
      );
      const watchlistCount = mappedLmsStudents.filter(isWatchlistStudent).length;
      const unknownMetricCount = mappedLmsStudents.filter(
        (student) => student.lms_logins === null || student.assignments_late === null,
      ).length;

      setUploadError(null);
      setStudents(mappedLmsStudents);
      setSelectedFile(null);
      setUploadMessage(
        `Assessed ${mappedLmsStudents.length} students: ${
          averageLogins === null
            ? 'no known LMS login values'
            : `${averageLogins.toFixed(1)} average LMS logins`
        }, ${totalLateAssignments} known late assignments, ${watchlistCount} on the watchlist, ${unknownMetricCount} with missing LMS risk inputs.`,
      );

      try {
        const { llmInsight } = isPdf
          ? await uploadStudentDataRecords(
              mappedLmsStudents.map((student) => ({
                student_id: student.student_id,
                name: student.name,
                cgpa: student.cgpa,
                backlogs: student.backlogs,
                attendance: student.attendance,
                lms_logins: student.lms_logins,
                assignments_late: student.assignments_late,
                placement_mock_score: student.placement_mock_score,
                technical_skill_score: student.technical_skill_score,
                student_satisfaction: student.student_satisfaction,
              })),
            )
          : await uploadStudentDataFile(selectedFile);
        onLlmInsight(llmInsight);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown server error.';
        setUploadError(
          `LMS assessment completed in this session, but student records could not be synced to the server: ${message}`,
        );
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Could not upload student data.');
    } finally {
      setUploading(false);
    }
  }

  const watchlist = useMemo(() => students.filter(isWatchlistStudent), [students]);
  const onTrackStudents = useMemo(
    () => students.filter(isOnTrackStudent),
    [students],
  );
  const criticalClusterCount = useMemo(
    () =>
      students.filter(
        (student) =>
          student.lms_logins !== null &&
          student.lms_logins < riskThresholds.lmsLoginsBelow &&
          student.assignments_late !== null &&
          student.assignments_late > riskThresholds.lateAssignmentsAbove,
      ).length,
    [students],
  );
  const knownLoginValues = students
    .map((student) => student.lms_logins)
    .filter((value): value is number => value !== null);
  const averageLogins = knownLoginValues.length
    ? knownLoginValues.reduce((total, value) => total + value, 0) / knownLoginValues.length
    : null;
  const knownLateAssignments = students.filter(
    (student) => student.assignments_late !== null,
  ).length;
  const unknownLmsMetrics = students.filter(
    (student) => student.lms_logins === null || student.assignments_late === null,
  ).length;
  const totalLateAssignments = students.reduce(
    (total, student) => total + (student.assignments_late ?? 0),
    0,
  );
  const engagementOnTrack =
    averageLogins === null ? null : averageLogins >= riskThresholds.lmsLoginsBelow;

  return (
    <section className="space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">LMS Core Scope</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">LMS Engagement Analytics</h2>
          <p className="mt-1 text-sm text-slate-400">
            Login activity and late submissions across the active student cohort.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-300 ${uploading ? 'cursor-wait opacity-50' : ''}`}>
            <Upload size={14} aria-hidden="true" />
            {selectedFile ? selectedFile.name : 'Choose File'}
            <input
              type="file"
              accept=".csv,.pdf"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                setSelectedFile(event.currentTarget.files?.[0] ?? null);
                setUploadError(null);
                setUploadMessage(null);
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => void uploadFile()}
            disabled={!selectedFile || uploading}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-200 transition hover:border-cyan-500/50 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload size={14} aria-hidden="true" />
            {uploading ? 'Uploading…' : 'Upload File'}
          </button>
          <button
            type="button"
            onClick={() => setStudents(generateMockStudents())}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-300 disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw size={14} className={uploading ? 'animate-spin' : ''} aria-hidden="true" />
            Refresh data
          </button>
        </div>
      </header>
      {uploadError && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {uploadError}
        </p>
      )}
      {uploadMessage && (
        <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {uploadMessage}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-300">Cohort Login Frequency</p>
                <p className="mt-3 text-4xl font-bold tabular-nums text-cyan-300">
                  {averageLogins === null ? 'Unknown' : averageLogins.toFixed(1)}
                </p>
                <p className="mt-1 text-xs text-slate-500">average logins per student</p>
              </div>
              <div className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                engagementOnTrack === true
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                  : engagementOnTrack === false
                    ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                    : 'border-slate-600 bg-slate-700/40 text-slate-300'
              }`}>
                {engagementOnTrack === true
                  ? <ArrowUpRight size={14} aria-hidden="true" />
                  : engagementOnTrack === false
                    ? <ArrowDownRight size={14} aria-hidden="true" />
                    : <Activity size={14} aria-hidden="true" />}
                {students.length === 0
                  ? 'No cohort data'
                  : engagementOnTrack === null
                    ? 'Unknown'
                    : engagementOnTrack
                      ? 'On track'
                      : 'Needs attention'}
              </div>
            </div>
            <div className="mt-5 border-t border-slate-800 pt-3 text-xs text-slate-500">
              Login watchlist threshold: below {riskThresholds.lmsLoginsBelow} · {knownLoginValues.length} known values / {students.length} students
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
            <p className="text-sm font-semibold text-slate-300">Assignment Submission Health</p>
            <div className="mt-3 flex items-baseline gap-2">
              <p className={`text-4xl font-bold tabular-nums ${totalLateAssignments > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                {totalLateAssignments}
              </p>
              <span className="text-sm text-slate-400">late assignments</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Total from {knownLateAssignments} known values; {students.length - knownLateAssignments} unknown
            </p>
            <div className="mt-5 flex items-center gap-2 border-t border-slate-800 pt-3 text-xs text-slate-500">
              <Activity size={14} className="text-cyan-400" aria-hidden="true" />
              <span>Across {students.length} active students</span>
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 p-5">
              <div>
                <h3 className="text-sm font-semibold text-white">Critical Disengagement Watchlist</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Fewer than {riskThresholds.lmsLoginsBelow} logins or more than {riskThresholds.lateAssignmentsAbove} late assignments
                </p>
              </div>
              <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2.5 py-1 text-xs font-bold text-rose-300">
                {watchlist.length} flagged
              </span>
            </div>
            {watchlist.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">
                {students.length === 0
                  ? 'No student records returned.'
                  : unknownLmsMetrics > 0
                    ? `No known breaches. ${unknownLmsMetrics} students have incomplete LMS risk data.`
                    : 'No students currently meet the watchlist criteria.'}
              </p>
            ) : (
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-900 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Student</th>
                      <th className="px-3 py-3 text-right font-medium">Logins</th>
                      <th className="px-5 py-3 text-right font-medium">Late</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {watchlist.map((student) => (
                      <tr key={student.student_id} className="hover:bg-slate-800/40">
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-2 font-medium text-white">
                            <AlertTriangle size={14} className="shrink-0 text-rose-400" aria-hidden="true" />
                            {student.name}
                            <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-300">
                              Alert
                            </span>
                          </span>
                        </td>
                        <td className={`px-3 py-3 text-right tabular-nums ${student.lms_logins !== null && student.lms_logins < riskThresholds.lmsLoginsBelow ? 'text-rose-300' : 'text-slate-300'}`}>
                          {student.lms_logins ?? 'Unknown'}
                        </td>
                        <td className={`px-5 py-3 text-right tabular-nums ${student.assignments_late !== null && student.assignments_late > riskThresholds.lateAssignmentsAbove ? 'text-rose-300' : 'text-slate-300'}`}>
                          {student.assignments_late ?? 'Unknown'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Engagement Distribution</h3>
                <p className="mt-1 text-xs text-slate-500">Each point represents one student</p>
              </div>
              <div className="flex gap-3 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-cyan-400" />On track</span>
                <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-rose-400" />Watchlist</span>
              </div>
            </div>
            <EngagementChart students={students} />
            <p className="mt-2 text-[11px] text-slate-500">
              Dashed lines mark {riskThresholds.lmsLoginsBelow} logins and {riskThresholds.lateAssignmentsAbove} late assignments.
            </p>

            <section
              aria-labelledby="graph-insights-title"
              className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 md:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 id="graph-insights-title" className="text-sm font-semibold text-white">
                  Graph Insights &amp; Summary
                </h4>
                <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200">
                  Cohort thresholds
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-amber-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                      Watchlist criteria
                    </span>
                    <span className="text-xs text-slate-300">
                      Dashed lines mark <strong className="text-white">{riskThresholds.lmsLoginsBelow} LMS logins</strong> and{' '}
                      <strong className="text-white">{riskThresholds.lateAssignmentsAbove} late assignments</strong>.
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    A student is marked Watchlist if either known threshold is crossed: fewer than {riskThresholds.lmsLoginsBelow} logins
                    or more than {riskThresholds.lateAssignmentsAbove} late assignments. Missing values remain unclassified.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3.5">
                    <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/25 bg-rose-400/10 px-2.5 py-1 text-[10px] font-semibold text-rose-200">
                      <i className="h-2 w-2 rounded-full bg-rose-400" />
                      Watchlist · {watchlist.length}
                    </span>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      The top-left quadrant combines low logins and high late assignments
                      ({criticalClusterCount} students). These appear as red dots. Red dots also include
                      students who cross either threshold on its own.
                    </p>
                  </div>

                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3.5">
                    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-200">
                      <i className="h-2 w-2 rounded-full bg-cyan-400" />
                      On Track · {onTrackStudents.length}
                    </span>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      The bottom-right quadrant represents at least {riskThresholds.lmsLoginsBelow} logins and no more than {riskThresholds.lateAssignmentsAbove} late
                      assignments. These students appear as blue/teal dots.
                    </p>
                  </div>
                </div>

                <p
                  role="status"
                  className="rounded-xl border border-indigo-400/20 bg-indigo-400/5 px-3.5 py-3 text-xs leading-relaxed text-slate-300"
                >
                  <strong className="mr-1 text-indigo-200">Overall cohort health:</strong>
                  {students.length === 0
                    ? 'No student records are available yet. Add cohort data to see where students fall across the engagement thresholds.'
                    : unknownLmsMetrics > 0
                      ? `${unknownLmsMetrics} students have unknown LMS risk inputs. ${onTrackStudents.length} are On Track and ${watchlist.length} meet known Watchlist criteria.`
                    : onTrackStudents.length > watchlist.length
                      ? `Most students are concentrated in the On Track zone (${onTrackStudents.length} of ${students.length}). ${criticalClusterCount > 0 ? `${criticalClusterCount} student${criticalClusterCount === 1 ? '' : 's'} fall in the critical low-login, high-late-assignment cluster and may need immediate intervention.` : 'No students currently fall in the low-login, high-late-assignment cluster.'}`
                      : onTrackStudents.length === watchlist.length
                        ? `The cohort is evenly split: ${onTrackStudents.length} On Track and ${watchlist.length} on the Watchlist. ${criticalClusterCount > 0 ? `${criticalClusterCount} student${criticalClusterCount === 1 ? '' : 's'} fall in the critical low-login, high-late-assignment cluster.` : 'Review students crossing either threshold to target support.'}`
                        : `More students are on the Watchlist (${watchlist.length}) than On Track (${onTrackStudents.length}). ${criticalClusterCount > 0 ? `${criticalClusterCount} student${criticalClusterCount === 1 ? '' : 's'} fall in the critical low-login, high-late-assignment cluster and may need immediate intervention.` : 'Review students crossing either threshold to target support.'}`}
                </p>
              </div>
            </section>
          </article>
        </div>
    </section>
  );
}
