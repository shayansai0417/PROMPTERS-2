import type { StudentRecord, Intervention } from '@/types';
import type { StudentTemplateRecord } from '@/lib/studentTemplate';

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ||
  'http://localhost:8000';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchStudentsFromBackend(): Promise<StudentRecord[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/students`);
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? (data as StudentRecord[]) : null;
  } catch {
    return null;
  }
}

export async function uploadStudentDataFile(
  file: File,
): Promise<{ students: StudentRecord[]; llmInsight: string }> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase().split(';')[0].trim();
  const uploadExtension =
    extension === 'json' ||
    mimeType === 'application/json' ||
    mimeType.endsWith('+json')
      ? '.json'
      : extension === 'pdf' || mimeType === 'application/pdf'
        ? '.pdf'
        : extension === 'csv' ||
          ['text/csv', 'application/csv', 'text/plain'].includes(mimeType)
        ? '.csv'
        : null;

  if (!uploadExtension) {
    throw new Error('Choose a CSV, JSON, or PDF file to upload.');
  }

  const formData = new FormData();
  const filenameBase = file.name.replace(/\.[^.]*$/, '') || 'student-data';
  formData.append('file', file, `${filenameBase}${uploadExtension}`);

  const res = await fetch(`${API_BASE_URL}/api/analytics/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const responseText = await res.text();
    let detail = responseText;
    try {
      const errorPayload: unknown = JSON.parse(responseText);
      if (isRecord(errorPayload) && typeof errorPayload.detail === 'string') {
        detail = errorPayload.detail;
      }
    } catch {
      // Keep the plain-text response when the server does not return JSON.
    }
    throw new Error(detail || `Upload failed with status ${res.status}: ${res.statusText}`);
  }

  const payload: unknown = await res.json();
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error('Server returned an invalid response structure.');
  }

  return {
    students: payload.data as StudentRecord[],
    llmInsight: typeof payload.llm_insight === 'string' ? payload.llm_insight : '',
  };
}

export async function uploadStudentDataRecords(
  records: readonly object[],
): Promise<{ students: StudentRecord[]; llmInsight: string }> {
  const file = new File([JSON.stringify(records)], 'lms-engagement.json', {
    type: 'application/json',
  });
  return uploadStudentDataFile(file);
}

export async function importStudentTemplateRecords(
  records: readonly StudentTemplateRecord[],
): Promise<StudentRecord[]> {
  const res = await fetch(`${API_BASE_URL}/api/students/import-template`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(records),
  });

  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      isRecord(payload) && typeof payload.detail === 'string'
        ? payload.detail
        : `Student import failed with status ${res.status}: ${res.statusText}`;
    throw new Error(detail);
  }
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error('The server did not return the persisted student records.');
  }
  return payload.data as StudentRecord[];
}

export async function submitNaturalEntryAPI(
  text: string,
): Promise<{ message: string; all_students: StudentRecord[] }> {
  const res = await fetch(`${API_BASE_URL}/api/analytics/natural-entry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const detail = errorJson?.detail || `Server returned ${res.status}: ${res.statusText}`;
    throw new Error(detail);
  }

  const payload: unknown = await res.json();
  if (!isRecord(payload) || !Array.isArray(payload.all_students)) {
    throw new Error('The backend did not return updated student records.');
  }

  return {
    message: typeof payload.message === 'string' ? payload.message : 'Updates applied successfully.',
    all_students: payload.all_students as StudentRecord[],
  };
}

export async function reloadBenchmarkFromBackend(): Promise<StudentRecord[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/analytics/benchmark`, {
      method: 'POST',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.students) ? (data.students as StudentRecord[]) : null;
  } catch {
    return null;
  }
}

export async function fetchBackendInterventions(): Promise<Intervention[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/interventions`);
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? (data as Intervention[]) : null;
  } catch {
    return null;
  }
}

export async function createBackendIntervention(
  intervention: Omit<Intervention, 'id'>,
): Promise<Intervention | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/interventions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intervention),
    });
    if (!res.ok) return null;
    return (await res.json()) as Intervention;
  } catch {
    return null;
  }
}

export async function fetchAIInsights(prompt?: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/analytics/llm-insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.insight === 'string' ? data.insight : null;
  } catch {
    return null;
  }
}
