import * as XLSX from 'xlsx';

export const STUDENT_TEMPLATE_HEADERS = [
  'student_id',
  'name',
  'department',
  'semester',
  'cgpa',
  'attendance_percent',
  'lms_logins',
  'late_assignments',
  'coding_score',
  'placement_status',
] as const;

export interface StudentTemplateRecord {
  student_id: string;
  name: string;
  department: string;
  semester: number | null;
  cgpa: number | null;
  attendance_percent: number | null;
  lms_logins: number | null;
  late_assignments: number | null;
  coding_score: number | null;
  placement_status: string | null;
}

export interface StudentTemplateError {
  row: number;
  field: string;
  message: string;
}

const headerAliases: Record<(typeof STUDENT_TEMPLATE_HEADERS)[number], string[]> = {
  student_id: ['studentid', 'id', 'rollnumber'],
  name: ['name', 'studentname', 'fullname'],
  department: ['department', 'dept'],
  semester: ['semester', 'sem'],
  cgpa: ['cgpa', 'gpa'],
  attendance_percent: ['attendancepercent', 'attendancepercentage', 'attendance'],
  lms_logins: ['lmslogins', 'logins'],
  late_assignments: ['lateassignments', 'assignmentslate'],
  coding_score: ['codingscore', 'coding'],
  placement_status: ['placementstatus', 'placement'],
};

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function cellText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';
}

function parseNumber(
  value: unknown,
  row: number,
  field: string,
  errors: StudentTemplateError[],
  options: { integer?: boolean; min: number; max?: number; percent?: boolean },
): number | null {
  const text = cellText(value);
  if (!text) return null;
  const numericText = options.percent ? text.replace(/%$/, '').trim() : text;
  const number = Number(numericText);
  if (!Number.isFinite(number)) {
    errors.push({ row, field, message: `"${text}" must be a number.` });
    return null;
  }
  if (options.integer && !Number.isInteger(number)) {
    errors.push({ row, field, message: `"${text}" must be a whole number.` });
    return null;
  }
  if (number < options.min || (options.max !== undefined && number > options.max)) {
    errors.push({
      row,
      field,
      message:
        options.max === undefined
          ? `Must be at least ${options.min}.`
          : `Must be between ${options.min} and ${options.max}.`,
    });
    return null;
  }
  return number;
}

export async function parseStudentTemplateFile(
  file: File,
): Promise<{ records: StudentTemplateRecord[]; errors: StudentTemplateError[] }> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      records: [],
      errors: [{ row: 1, field: 'file', message: 'The workbook has no worksheets.' }],
    };
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheetName], {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  if (rows.length < 2) {
    return {
      records: [],
      errors: [{ row: 1, field: 'file', message: 'Add a header row and at least one student row.' }],
    };
  }

  const headerCells = rows[0].map((cell) => normalizeHeader(cell));
  const fieldIndexes = new Map<(typeof STUDENT_TEMPLATE_HEADERS)[number], number>();
  for (const field of STUDENT_TEMPLATE_HEADERS) {
    const aliases = headerAliases[field];
    const index = headerCells.findIndex((header) => aliases.includes(header));
    if (index < 0) {
      return {
        records: [],
        errors: [
          {
            row: 1,
            field,
            message: `Required column "${field}" is missing. Download the template for the exact column layout.`,
          },
        ],
      };
    }
    fieldIndexes.set(field, index);
  }

  const errors: StudentTemplateError[] = [];
  const records: StudentTemplateRecord[] = [];
  const seenStudentIds = new Map<string, number>();

  for (let index = 1; index < rows.length; index += 1) {
    const source = rows[index];
    if (source.every((cell) => cellText(cell) === '')) continue;
    const rowNumber = index + 1;
    const value = (field: (typeof STUDENT_TEMPLATE_HEADERS)[number]) =>
      source[fieldIndexes.get(field) ?? -1];
    const studentId = cellText(value('student_id'));
    const name = cellText(value('name'));
    const department = cellText(value('department'));

    if (!studentId) errors.push({ row: rowNumber, field: 'student_id', message: 'Student ID is required.' });
    if (!name) errors.push({ row: rowNumber, field: 'name', message: 'Student name is required.' });
    if (!department) errors.push({ row: rowNumber, field: 'department', message: 'Department is required.' });

    const normalizedId = studentId.toLowerCase();
    if (normalizedId && seenStudentIds.has(normalizedId)) {
      errors.push({
        row: rowNumber,
        field: 'student_id',
        message: `Duplicate ID; it first appears on row ${seenStudentIds.get(normalizedId)}.`,
      });
    } else if (normalizedId) {
      seenStudentIds.set(normalizedId, rowNumber);
    }

    const semester = parseNumber(value('semester'), rowNumber, 'semester', errors, {
      integer: true,
      min: 1,
      max: 12,
    });
    const cgpa = parseNumber(value('cgpa'), rowNumber, 'cgpa', errors, {
      min: 0,
      max: 10,
    });
    const attendance = parseNumber(value('attendance_percent'), rowNumber, 'attendance_percent', errors, {
      min: 0,
      max: 100,
      percent: true,
    });
    const logins = parseNumber(value('lms_logins'), rowNumber, 'lms_logins', errors, {
      integer: true,
      min: 0,
    });
    const lateAssignments = parseNumber(value('late_assignments'), rowNumber, 'late_assignments', errors, {
      integer: true,
      min: 0,
    });
    const codingScore = parseNumber(value('coding_score'), rowNumber, 'coding_score', errors, {
      min: 0,
      max: 100,
      percent: true,
    });
    const placementStatus = cellText(value('placement_status')) || null;

    if (studentId && name && department) {
      records.push({
        student_id: studentId,
        name,
        department,
        semester,
        cgpa,
        attendance_percent: attendance,
        lms_logins: logins,
        late_assignments: lateAssignments,
        coding_score: codingScore,
        placement_status: placementStatus,
      });
    }
  }

  if (records.length === 0 && errors.length === 0) {
    errors.push({ row: 2, field: 'student', message: 'No non-empty student rows were found.' });
  }
  return { records, errors };
}

export function downloadStudentTemplate(): void {
  const example = [
    STUDENT_TEMPLATE_HEADERS,
    ['STU1001', 'Aarav Sharma', 'Computer Science', 7, 8.6, 92, 14, 1, 85, 'In Process'],
  ];
  const csv = example
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell);
          return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(','),
    )
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'student-import-template.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
