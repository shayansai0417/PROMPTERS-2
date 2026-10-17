import { useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { Users, AlertTriangle, Target, BookOpen } from 'lucide-react';
import type { LogEntry } from '@/types';

interface AnalyticsProps {
  logs: LogEntry[];
  refresh: () => void;
}

export default function Analytics({ logs, refresh }: AnalyticsProps) {
  useEffect(() => {
    refresh();
  }, [refresh]);

  const perStudent = useMemo(() => {
    const map = new Map<string, { name: string; entries: LogEntry[] }>();
    logs.forEach((log) => {
      const existing = map.get(log.studentName);
      if (existing) {
        existing.entries.push(log);
      } else {
        map.set(log.studentName, { name: log.studentName, entries: [log] });
      }
    });
    return Array.from(map.values()).map((s) => ({
      name: s.name,
      avgScore: Math.round(s.entries.reduce((sum, e) => sum + e.successScore, 0) / s.entries.length),
      avgStudy: +(s.entries.reduce((sum, e) => sum + e.studyHours, 0) / s.entries.length).toFixed(1),
      avgStress: +(s.entries.reduce((sum, e) => sum + e.stressLevel, 0) / s.entries.length).toFixed(1),
      logs: s.entries.length,
    }));
  }, [logs]);

  const scatterData = useMemo(
    () => logs.map((l) => ({ x: l.studyHours, y: l.stressLevel, z: l.successScore, name: l.studentName })),
    [logs],
  );

  const insights = useMemo(() => {
    if (logs.length === 0) return [];
    const sorted = [...perStudent].sort((a, b) => b.avgScore - a.avgScore);
    const top = sorted[0];
    const atRisk = sorted.filter((s) => s.avgScore < 40);
    const highStress = perStudent.filter((s) => s.avgStress >= 7);

    const result: { icon: React.ReactNode; text: string; color: string }[] = [];
    if (top) {
      result.push({
        icon: <Target size={18} />,
        text: `${top.name} has the highest average success score of ${top.avgScore}/100.`,
        color: 'text-emerald-400',
      });
    }
    if (atRisk.length > 0) {
      result.push({
        icon: <AlertTriangle size={18} />,
        text: `${atRisk.length} student(s) are at risk with scores below 40: ${atRisk.map((s) => s.name).join(', ')}.`,
        color: 'text-rose-400',
      });
    }
    if (highStress.length > 0) {
      result.push({
        icon: <AlertTriangle size={18} />,
        text: `${highStress.length} student(s) report high stress (7+): ${highStress.map((s) => s.name).join(', ')}.`,
        color: 'text-amber-400',
      });
    }
    return result;
  }, [logs, perStudent]);

  return (
    <div className="min-h-[calc(100vh-8rem)] space-y-8 rounded-2xl border border-[#d4af37]/30 bg-[#0d0d0d] p-6 animate-[slideIn_0.4s_ease-out]">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Analytics</h1>
        <p className="text-slate-400 mt-1">Deep-dive insights into student performance patterns</p>
      </div>

      {logs.length === 0 ? (
        <div className="bg-[#1a0f0f] backdrop-blur-md border border-red-950/50 rounded-2xl p-6 text-center">
          <p className="text-slate-500">No analytics data available. Submit logs to generate insights.</p>
        </div>
      ) : (
        <>
          {/* Insights */}
          {insights.length > 0 && (
            <div className="grid gap-4">
              {insights.map((ins, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6"
                >
                  <span className={ins.color}>{ins.icon}</span>
                  <p className="text-sm text-slate-300">{ins.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Per-student bar chart */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users size={20} className="text-sky-400" />
              <h2 className="text-lg font-semibold text-white">Average Score by Student</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={perStudent} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    color: '#e2e8f0',
                  }}
                />
                <Bar dataKey="avgScore" fill="#34d399" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Scatter plot: study hours vs stress, bubble = score */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <BookOpen size={20} className="text-violet-400" />
              <h2 className="text-lg font-semibold text-white">
                Study Hours vs. Stress Level (bubble = Success Score)
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Study Hours"
                  stroke="#64748b"
                  fontSize={12}
                  label={{ value: 'Study Hours', position: 'bottom', fill: '#64748b', fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Stress Level"
                  stroke="#64748b"
                  fontSize={12}
                  domain={[0, 10]}
                  label={{ value: 'Stress', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }}
                />
                <ZAxis type="number" dataKey="z" range={[60, 400]} name="Score" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    color: '#e2e8f0',
                  }}
                  formatter={(value, name) => [String(value), name]}
                />
                <Scatter data={scatterData} fill="#818cf8" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Student table */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 overflow-x-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Student Breakdown</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-left border-b border-white/5">
                  <th className="pb-3 font-medium">Student</th>
                  <th className="pb-3 font-medium text-right">Avg Score</th>
                  <th className="pb-3 font-medium text-right">Avg Study (h)</th>
                  <th className="pb-3 font-medium text-right">Avg Stress</th>
                  <th className="pb-3 font-medium text-right">Entries</th>
                </tr>
              </thead>
              <tbody>
                {perStudent.map((s) => (
                  <tr key={s.name} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 text-white font-medium">{s.name}</td>
                    <td className="py-3 text-right text-emerald-400 font-semibold">{s.avgScore}</td>
                    <td className="py-3 text-right text-sky-400">{s.avgStudy}</td>
                    <td className="py-3 text-right text-amber-400">{s.avgStress}</td>
                    <td className="py-3 text-right text-slate-400">{s.logs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
