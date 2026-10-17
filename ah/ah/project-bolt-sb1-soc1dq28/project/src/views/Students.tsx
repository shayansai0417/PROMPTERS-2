import { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, X, Sparkles } from 'lucide-react';
import type { StudentRecord } from '@/types';
import { getSuccessScoreBreakdown } from '@/lib/studentData';
import riskConfig from '../../../../../risk_config.json';

interface StudentsProps {
  students: StudentRecord[];
  searchQuery: string;
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function displayMetric(value: number | null | undefined, suffix = ''): string {
  return value === null || value === undefined ? 'Unknown' : `${value}${suffix}`;
}

export default function Students({ students, searchQuery }: StudentsProps) {
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);

  const departments = [
    'All',
    ...new Set(
      students
        .map((student) => readText(student?.department))
        .filter((department) => department !== ''),
    ),
  ];
  const riskCategories = ['All', 'High Risk', 'Medium Risk', 'Low Risk', 'Unknown'];
  const segmentCategories = [
    'All',
    'Scholars',
    'Academic Focus',
    'Tech Coders',
    'Critical Intervention',
  ];
  const [segmentFilter, setSegmentFilter] = useState('All');

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const segmentQuery = segmentFilter.toLowerCase();
    return students.filter((s) => {
      const matchSearch =
        query === '' ||
        readText(s?.name).toLowerCase().includes(query) ||
        readText(s?.rollNumber).toLowerCase().includes(query) ||
        readText(s?.department).toLowerCase().includes(query);
      const matchDept =
        departmentFilter === 'All' || readText(s?.department) === departmentFilter;
      const matchRisk = riskFilter === 'All' || s.riskCategory === riskFilter;
      const matchSegment =
        segmentFilter === 'All' ||
        readText(s?.segment).toLowerCase().includes(segmentQuery);
      return matchSearch && matchDept && matchRisk && matchSegment;
    });
  }, [students, searchQuery, departmentFilter, riskFilter, segmentFilter]);
  const selectedScoreBreakdown = selectedStudent
    ? getSuccessScoreBreakdown(selectedStudent)
    : [];

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Unified Student Directory</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            360° student success profiling across academics, attendance, LMS, and placement readiness.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                Dept: {d}
              </option>
            ))}
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            {riskCategories.map((r) => (
              <option key={r} value={r}>
                Risk: {r}
              </option>
            ))}
          </select>

          <select
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-xs text-indigo-200 focus:outline-none focus:border-indigo-500"
          >
            {segmentCategories.map((seg) => (
              <option key={seg} value={seg}>
                Segment: {seg}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-800 bg-[#111827]/80 backdrop-blur-sm overflow-hidden shadow-xl">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No students found matching current filters or no data uploaded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-3">CGPA</th>
                  <th className="py-3 px-3">Attendance</th>
                  <th className="py-3 px-3">Placement</th>
                  <th className="py-3 px-3">Success Score</th>
                  <th className="py-3 px-3">Segment (Bonus)</th>
                  <th className="py-3 px-3">Risk Level / Reasons</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filtered.map((st) => (
                  <tr
                    key={st.id}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    onClick={() => setSelectedStudent(st)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{st.name}</div>
                      <div className="text-[11px] text-slate-400">{st.rollNumber} • {st.department}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-200">{st.cgpa ?? 'Unknown'}</span>
                      {st.backlogs !== null && st.backlogs > 0 && (
                        <span className="ml-1.5 text-[10px] text-rose-400 font-medium">({st.backlogs} Backlog)</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={st.attendancePercentage !== null && st.attendancePercentage < riskConfig.riskThresholds.attendancePercentBelow ? 'text-rose-400 font-semibold' : 'text-slate-200'}>
                        {st.attendancePercentage === null ? 'Unknown' : `${st.attendancePercentage}%`}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={st.placementScore !== null && st.placementScore < 60 ? 'text-amber-400 font-semibold' : 'text-slate-200'}>
                        {st.placementScore === null ? 'Unknown' : `${st.placementScore}%`}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{st.successScore ?? 'Unknown'}</span>
                        {st.successScore !== null && <div className="w-14 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              st.successScore >= 80
                                ? 'bg-emerald-500'
                                : st.successScore >= 65
                                ? 'bg-indigo-500'
                                : st.successScore >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${st.successScore}%` }}
                          />
                        </div>}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border whitespace-nowrap ${
                          readText(st.segment).includes('Scholars')
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : readText(st.segment).includes('Academic Focus')
                            ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                            : readText(st.segment).includes('Tech Coders')
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : readText(st.segment).includes('Critical Intervention')
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : 'bg-slate-700/40 text-slate-300 border-slate-600'
                        }`}
                      >
                        {readText(st.segment).split(' ')[0]} {readText(st.segment).split(' ')[1] || ''}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                        st.riskCategory === 'High Risk'
                          ? 'border-rose-500/30 bg-rose-500/15 text-rose-400'
                          : st.riskCategory === 'Medium Risk'
                            ? 'border-amber-500/30 bg-amber-500/15 text-amber-400'
                            : st.riskCategory === 'Low Risk'
                              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                              : 'border-slate-600 bg-slate-700/40 text-slate-300'
                      }`}>{st.riskCategory}</span>
                      <p className="mt-1 max-w-xs text-[10px] leading-relaxed text-slate-400">
                        {st.riskReasons.length ? st.riskReasons.join('; ') : st.riskCategory === 'Unknown' ? 'Insufficient data' : 'No threshold breaches'}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudent(st);
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Explainable Score & Student Profile Drawer Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-indigo-500/20 bg-[#0f172a] p-6 shadow-2xl">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  Student Profile &amp; Explainability
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{selectedStudent.name}</h3>
                <p className="text-xs text-slate-400">
                  {selectedStudent.rollNumber} • {selectedStudent.department} • Semester {displayMetric(selectedStudent.semester)}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="my-5 space-y-4 text-xs">
              {/* Score banner */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400">Composite Success Score</p>
                  <p className="text-3xl font-extrabold text-white mt-1">{selectedStudent.successScore ?? 'Unknown'} / 100</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-400">Classification</p>
                  <span
                    className={`inline-block mt-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                      selectedStudent.riskCategory === 'High Risk'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : selectedStudent.riskCategory === 'Medium Risk'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : selectedStudent.riskCategory === 'Low Risk'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                    }`}
                  >
                    {selectedStudent.riskCategory}
                  </span>
                </div>
              </div>

              {/* Segment */}
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
                <span className="font-semibold text-indigo-300">Segment Group:</span>{' '}
                <span className="text-slate-200">{selectedStudent.segment}</span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs">
                <span className="mb-1 block text-[10px] font-bold uppercase text-slate-400">
                  Risk reasons
                </span>
                {selectedStudent.riskReasons.length > 0 ? (
                  <ul className="list-inside list-disc space-y-1 text-rose-200">
                    {selectedStudent.riskReasons.map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                ) : (
                  <p className="text-slate-300">
                    {selectedStudent.riskCategory === 'Unknown'
                      ? 'Risk could not be classified because no risk inputs are available.'
                      : 'No configured risk thresholds are breached.'}
                  </p>
                )}
              </div>

              {/* Explainable Indicator Attribution (Bonus Feature) */}
              <div className="space-y-3">
                <div className="rounded-xl border border-indigo-500/25 bg-slate-900/90 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-400" />
                      <span>Indicator Attribution (Success Score)</span>
                    </span>
                    <span className="text-[11px] text-slate-400">Contribution</span>
                  </div>

                  <div className="space-y-1.5 pt-1 text-xs">
                    {selectedScoreBreakdown.map((component) => (
                      <div key={component.label} className="flex items-center justify-between text-slate-300">
                        <span>
                          • {component.label} factor
                          {component.effectiveWeight === null
                            ? ' (unknown):'
                            : ` (${Math.round(component.effectiveWeight * 100)}% effective weight):`}
                        </span>
                        <span className="font-semibold text-indigo-300">
                          {component.contribution === null
                            ? 'Excluded'
                            : `+${component.contribution.toFixed(1)} pts`}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-800 font-bold text-white">
                      <span>Total Composite Score:</span>
                      <span className="text-indigo-400">{selectedStudent.successScore ?? 'Unknown'} / 100</span>
                    </div>
                  </div>
                </div>

                {/* Primary Risk Flag Driver (Bonus Feature) */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Primary Driver Behind Risk Flag
                  </span>
                  <p className={`font-medium ${
                    selectedStudent.riskCategory === 'High Risk'
                      ? 'text-rose-300'
                      : selectedStudent.riskCategory === 'Medium Risk'
                        ? 'text-amber-300'
                        : selectedStudent.riskCategory === 'Unknown'
                          ? 'text-slate-300'
                          : 'text-emerald-300'
                  }`}>
                    {selectedStudent.riskCategory === 'Unknown'
                      ? 'Risk level is unknown because there are no measurable risk inputs.'
                      : selectedStudent.riskReasons.length
                        ? `${selectedStudent.riskFactorCount ?? selectedStudent.riskReasons.length} threshold breach(es) identified.`
                        : 'No known risk thresholds are breached.'}
                  </p>
                </div>
              </div>

              {/* Explainable Score Drivers */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                  Key Score Drivers &amp; Triggers
                </h4>

                {selectedStudent.keyDrivers.positive.length > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-emerald-400">Strengths / Positive Drivers</p>
                    {selectedStudent.keyDrivers.positive.map((pos, i) => (
                      <p key={i} className="text-emerald-200 flex items-center gap-1.5">
                        <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                        <span>{pos}</span>
                      </p>
                    ))}
                  </div>
                )}

                {selectedStudent.keyDrivers.negative.length > 0 && (
                  <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-rose-400">Risk Triggers / Negative Penalties</p>
                    {selectedStudent.keyDrivers.negative.map((neg, i) => (
                      <p key={i} className="text-rose-200 flex items-center gap-1.5">
                        <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                        <span>{neg}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Unified 7-Pillars Data Integration */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                  Unified 7-Pillar Student Records
                </h4>

                <div className="grid grid-cols-2 gap-2 text-slate-300 text-xs">
                  {/* 1. Academic */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase">1. Academic</p>
                    <p className="mt-0.5 font-bold text-white">CGPA: {selectedStudent.cgpa ?? 'Unknown'} / 10</p>
                    <p className="text-[11px] text-slate-400">
                      Backlogs: {selectedStudent.backlogs ?? 'Unknown'} • Internal: {selectedStudent.internalMarks === null ? 'Unknown' : `${selectedStudent.internalMarks}%`}
                    </p>
                  </div>

                  {/* 2. Attendance */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase">2. Attendance</p>
                    <p className="mt-0.5 font-bold text-white">{selectedStudent.attendancePercentage === null ? 'Unknown' : `${selectedStudent.attendancePercentage}%`}</p>
                    <p className="text-[11px] text-slate-400">
                      {selectedStudent.attendancePercentage === null
                        ? 'Attendance is unknown'
                        : selectedStudent.attendancePercentage < riskConfig.riskThresholds.attendancePercentBelow
                          ? `Below ${riskConfig.riskThresholds.attendancePercentBelow}% cutoff`
                          : 'Eligible for exams'}
                    </p>
                  </div>

                  {/* 3. LMS */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <p className="text-[10px] font-bold text-sky-400 uppercase">3. LMS Engagement</p>
                    <p className="mt-0.5 font-bold text-white">{displayMetric(selectedStudent.lmsCompletionRate, '%')} Completion</p>
                    <p className="text-[11px] text-slate-400">
                      {displayMetric(selectedStudent.lmsLoginFrequency)} weekly logins · {displayMetric(selectedStudent.assignmentsLate)} late assignments
                    </p>
                  </div>

                  {/* 4. Engagement */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <p className="text-[10px] font-bold text-purple-400 uppercase">4. Engagement</p>
                    <p className="mt-0.5 font-bold text-white">{selectedStudent.certificationsCount} Certifications</p>
                    <p className="text-[11px] text-slate-400">{selectedStudent.clubsEvents}</p>
                  </div>

                  {/* 5. Placement */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <p className="text-[10px] font-bold text-amber-400 uppercase">5. Placement</p>
                    <p className="mt-0.5 font-bold text-white">Aptitude: {displayMetric(selectedStudent.aptitudeScore, '%')}</p>
                    <p className="text-[11px] text-slate-400">Mock Interview: {displayMetric(selectedStudent.mockInterviewScore, '%')}</p>
                  </div>

                  {/* 6. Skills */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <p className="text-[10px] font-bold text-teal-400 uppercase">6. Skills</p>
                    <p className="mt-0.5 font-bold text-white">Coding: {displayMetric(selectedStudent.codingScore, '%')}</p>
                    <p className="text-[11px] text-slate-400">Soft Skills: {displayMetric(selectedStudent.softSkillScore, '%')}</p>
                  </div>
                </div>

                {/* 7. Feedback */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-pink-400 uppercase">7. Qualitative Feedback &amp; Sentiment</p>
                    <span className="text-[11px] font-semibold text-slate-300">
                      Satisfaction: {displayMetric(selectedStudent.studentSatisfaction)} / 5.0
                    </span>
                  </div>
                  <p className="text-slate-300 mt-1 italic leading-relaxed">
                    &ldquo;{selectedStudent.facultyFeedback}&rdquo;
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
