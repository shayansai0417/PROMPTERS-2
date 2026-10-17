import type { LogEntry } from '@/types';

const STORAGE_KEY = 'gradeboost-logs';

export function calculateSuccessScore(studyHours: number, stressLevel: number): number {
  const raw = studyHours * 4 + (100 - stressLevel * 10);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function loadLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LogEntry[];
  } catch {
    return [];
  }
}

export function saveLogs(logs: LogEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export function addLog(
  studentName: string,
  studyHours: number,
  stressLevel: number,
): LogEntry[] {
  const logs = loadLogs();
  const entry: LogEntry = {
    id: crypto.randomUUID(),
    studentName: studentName.trim(),
    studyHours,
    stressLevel,
    successScore: calculateSuccessScore(studyHours, stressLevel),
    timestamp: Date.now(),
  };
  logs.push(entry);
  saveLogs(logs);
  return logs;
}

export function deleteLog(id: string): LogEntry[] {
  const logs = loadLogs().filter((log) => log.id !== id);
  saveLogs(logs);
  return logs;
}

export function clearAllLogs(): LogEntry[] {
  saveLogs([]);
  return [];
}
