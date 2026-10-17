import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { LogEntry } from '@/types';
import { addLog, deleteLog, clearAllLogs, calculateSuccessScore } from '@/lib/scoring';
import { formatDate, scoreGrade } from '@/lib/format';

interface InputLogsProps {
  logs: LogEntry[];
  onLogsChange: (logs: LogEntry[]) => void;
  refresh: () => void;
}

interface FormData {
  studentName: string;
  studyHours: string;
  stressLevel: string;
}

const initialForm: FormData = {
  studentName: '',
  studyHours: '',
  stressLevel: '5',
};

export default function InputLogs({ logs, onLogsChange, refresh }: InputLogsProps) {
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const previewScore = useMemo(() => {
    const hours = parseFloat(form.studyHours);
    const stress = parseInt(form.stressLevel, 10);
    if (isNaN(hours) || isNaN(stress)) return null;
    return calculateSuccessScore(hours, stress);
  }, [form.studyHours, form.stressLevel]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.studentName.trim()) next.studentName = 'Student name is required';
    const hours = parseFloat(form.studyHours);
    if (form.studyHours === '' || isNaN(hours)) next.studyHours = 'Enter a valid number';
    else if (hours < 0) next.studyHours = 'Cannot be negative';
    else if (hours > 168) next.studyHours = 'Cannot exceed 168 hours/week';
    const stress = parseInt(form.stressLevel, 10);
    if (isNaN(stress) || stress < 1 || stress > 10) next.stressLevel = 'Select 1–10';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      setToast({ type: 'error', msg: 'Please fix the errors above.' });
      return;
    }
    const updated = addLog(
      form.studentName,
      parseFloat(form.studyHours),
      parseInt(form.stressLevel, 10),
    );
    onLogsChange(updated);
    setForm(initialForm);
    setErrors({});
    setToast({ type: 'success', msg: 'Log submitted successfully! AI score calculated.' });
  }

  function handleDelete(id: string) {
    const updated = deleteLog(id);
    onLogsChange(updated);
  }

  function handleClearAll() {
    const updated = clearAllLogs();
    onLogsChange(updated);
    setToast({ type: 'success', msg: 'All logs cleared.' });
  }

  return (
    <div className="space-y-8 animate-[slideIn_0.4s_ease-out]">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Input Logs</h1>
        <p className="text-slate-400 mt-1">Record student data to feed the AI predictive engine</p>
      </div>

      {toast && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium animate-[slideDown_0.3s_ease-out] ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="bg-[#1a0f0f] backdrop-blur-md border border-red-950/50 rounded-2xl p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-white mb-1">New Entry</h2>
            <p className="text-sm text-slate-400 mb-6">Fill in the student's weekly data below.</p>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Student Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Student Name
                </label>
                <input
                  type="text"
                  value={form.studentName}
                  onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                  placeholder="e.g. Jane Cooper"
                  className={`w-full bg-amber-950/40 backdrop-blur-md border rounded-2xl px-5 py-4 text-white placeholder-slate-500 text-sm outline-none transition-colors ${
                    errors.studentName ? 'border-rose-500/50' : 'border-yellow-500 focus:border-amber-400'
                  }`}
                />
                {errors.studentName && (
                  <p className="text-xs text-rose-400 mt-1.5">{errors.studentName}</p>
                )}
              </div>

              {/* Weekly Study Hours */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Weekly Study Hours
                </label>
                <input
                  type="number"
                  min={0}
                  max={168}
                  step="0.5"
                  value={form.studyHours}
                  onChange={(e) => setForm({ ...form, studyHours: e.target.value })}
                  placeholder="e.g. 25"
                  className={`w-full bg-amber-950/40 backdrop-blur-md border rounded-2xl px-5 py-4 text-white placeholder-slate-500 text-sm outline-none transition-colors ${
                    errors.studyHours ? 'border-rose-500/50' : 'border-yellow-500 focus:border-amber-400'
                  }`}
                />
                {errors.studyHours && (
                  <p className="text-xs text-rose-400 mt-1.5">{errors.studyHours}</p>
                )}
              </div>

              {/* Stress Level */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Current Stress Level
                </label>
                <select
                  value={form.stressLevel}
                  onChange={(e) => setForm({ ...form, stressLevel: e.target.value })}
                  className={`w-full bg-amber-950/40 backdrop-blur-md border rounded-2xl px-5 py-4 text-white text-sm outline-none transition-colors cursor-pointer ${
                    errors.stressLevel ? 'border-rose-500/50' : 'border-yellow-500 focus:border-amber-400'
                  }`}
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n} className="bg-amber-950">
                      {n} {n <= 3 ? '(Low)' : n <= 6 ? '(Moderate)' : n <= 8 ? '(High)' : '(Critical)'}
                    </option>
                  ))}
                </select>
                {errors.stressLevel && (
                  <p className="text-xs text-rose-400 mt-1.5">{errors.stressLevel}</p>
                )}
              </div>

              {/* Live preview */}
              {previewScore !== null && (
                <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-white/5">
                  <p className="text-xs text-slate-400 mb-1">AI Predicted Success Score</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-emerald-400">{previewScore}</span>
                    <span className="text-sm text-slate-500 mb-1">/ 100</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Formula: (Hours × 4) + (100 − Stress × 10)
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 border border-amber-300 text-neutral-900 font-semibold py-4 rounded-2xl transition-colors"
              >
                <Plus size={18} />
                Submit Log Entry
              </button>
            </form>
          </div>
        </div>

        {/* Log list */}
        <div className="lg:col-span-3">
          <div className="bg-[#1a0f0f] backdrop-blur-md border border-red-950/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                All Logs <span className="text-slate-500 text-sm font-normal">({logs.length})</span>
              </h2>
              {logs.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  Clear All
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 mx-auto flex items-center justify-center mb-4">
                  <Plus size={24} className="text-neutral-900" />
                </div>
                <p className="text-yellow-200/80 text-sm">No logs yet. Submit your first entry!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {[...logs].reverse().map((log) => {
                  const g = scoreGrade(log.successScore);
                  return (
                    <div
                      key={log.id}
                      className="group flex items-center justify-between p-4 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/5 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                          {log.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{log.studentName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{formatDate(log.timestamp)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                        <div className="text-center hidden xs:block">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Study</p>
                          <p className="text-sm font-medium text-sky-400">{log.studyHours}h</p>
                        </div>
                        <div className="text-center hidden sm:block">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Stress</p>
                          <p className="text-sm font-medium text-amber-400">{log.stressLevel}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Score</p>
                          <p className={`text-sm font-bold ${g.color}`}>{log.successScore}</p>
                        </div>
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-all p-1"
                          aria-label="Delete entry"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
