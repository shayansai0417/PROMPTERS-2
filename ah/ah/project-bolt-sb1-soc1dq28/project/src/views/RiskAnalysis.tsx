import { BookOpen, ShieldAlert, Users } from 'lucide-react';
import type { StudentRecord } from '@/types';

interface RiskAnalysisProps {
  students: StudentRecord[];
  onOpenAddIntervention: () => void;
}

const riskLevels: Array<{
  label: StudentRecord['riskCategory'];
  title: string;
  detail: string;
  iconClass: string;
  icon: typeof Users;
}> = [
  {
    label: 'High Risk',
    title: 'High Risk',
    detail: '2 or more known factors breach their thresholds.',
    iconClass: 'border-rose-500/30 bg-rose-500/15 text-rose-400',
    icon: ShieldAlert,
  },
  {
    label: 'Medium Risk',
    title: 'Medium Risk',
    detail: '1 known factor breaches its threshold.',
    iconClass: 'border-amber-500/30 bg-amber-500/15 text-amber-400',
    icon: BookOpen,
  },
  {
    label: 'Low Risk',
    title: 'Low Risk',
    detail: 'Known factors are within their thresholds.',
    iconClass: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400',
    icon: Users,
  },
];

export default function RiskAnalysis({
  students,
  onOpenAddIntervention,
}: RiskAnalysisProps) {
  const highCount = students.filter((student) => student.riskCategory === 'High Risk').length;
  const mediumCount = students.filter((student) => student.riskCategory === 'Medium Risk').length;
  const lowCount = students.filter((student) => student.riskCategory === 'Low Risk').length;
  const unknownCount = students.filter((student) => student.riskCategory === 'Unknown').length;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Student Risk Analysis</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Risk levels use known attendance, CGPA, LMS login, and late-assignment values only.
          Missing values are excluded from scoring and classification.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {riskLevels.map((level) => {
          const Icon = level.icon;
          const count =
            level.label === 'High Risk'
              ? highCount
              : level.label === 'Medium Risk'
                ? mediumCount
                : lowCount;
          return (
            <div
              key={level.label}
              className="flex min-h-[160px] flex-col justify-between rounded-2xl border border-slate-800 bg-[#111827]/80 p-5 shadow-lg"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {level.title}
                </span>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${level.iconClass}`}>
                  <Icon size={20} />
                </div>
              </div>
              <div className="my-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold leading-none tracking-tight text-white">
                  {count}
                </span>
                <span className="text-xs font-medium text-slate-400">students</span>
              </div>
              <div className="border-t border-slate-800 pt-3 text-[11px] leading-relaxed text-slate-400">
                {level.detail}
              </div>
            </div>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111827]/80 p-5 shadow-xl">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Student Risk Factors</h3>
            <p className="text-xs text-slate-400">
              High risk is counted as At-Risk on Overview; Medium risk remains visible for monitoring.
            </p>
          </div>
          <button
            onClick={onOpenAddIntervention}
            disabled={highCount === 0}
            className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Schedule Intervention
          </button>
        </div>

        {students.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Upload student records to evaluate risk factors.
          </div>
        ) : (
          <div className="max-h-[600px] divide-y divide-slate-800 overflow-y-auto text-xs">
            {students.map((student) => {
              const riskColor =
                student.riskCategory === 'High Risk'
                  ? 'border-rose-500/30 bg-rose-500/15 text-rose-300'
                  : student.riskCategory === 'Medium Risk'
                    ? 'border-amber-500/30 bg-amber-500/15 text-amber-300'
                    : student.riskCategory === 'Low Risk'
                      ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                      : 'border-slate-600 bg-slate-700/40 text-slate-300';
              return (
                <div
                  key={student.id}
                  className="grid gap-2 py-3 sm:grid-cols-[minmax(170px,0.8fr)_minmax(0,2fr)] sm:items-start"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">{student.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {student.rollNumber} · {student.department}
                    </p>
                    <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${riskColor}`}>
                      {student.riskCategory}
                      {student.riskCategory === 'High Risk' && ' · At-Risk'}
                    </span>
                  </div>
                  <p className="leading-relaxed text-slate-300">
                    {student.riskReasons.length > 0
                      ? student.riskReasons.join('; ')
                      : student.riskCategory === 'Unknown'
                        ? 'Not enough known risk factors to classify this student.'
                        : 'No configured risk thresholds breached.'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        {unknownCount > 0 && (
          <p className="mt-3 border-t border-slate-800 pt-3 text-[11px] text-slate-500">
            {unknownCount} student{unknownCount === 1 ? '' : 's'} cannot yet be classified because all
            four risk inputs are unknown.
          </p>
        )}
      </section>
    </div>
  );
}
