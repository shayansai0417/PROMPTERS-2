import { Award, BookOpen, Terminal, AlertOctagon, CircleHelp } from 'lucide-react';
import type { StudentRecord } from '@/types';

interface SegmentsProps {
  students: StudentRecord[];
}

export default function Segments({ students }: SegmentsProps) {
  const segments = [
    {
      title: 'Scholars (High Academics & Placement)',
      description: 'Top-tier candidates with CGPA >= 7.5 and Placement Score >= 70%. Ready for dream company hiring.',
      action: 'Nominate for leadership roles, research internships, and elite hiring pools.',
      students: students.filter((s) => s.segment === 'Scholars (High Academics & Placement)'),
      icon: Award,
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    },
    {
      title: 'Academic Focus (High CGPA, Low Placement)',
      description: 'Strong exam scores but lagging in coding and technical assessments. Key intervention target.',
      action: 'Mandatory enrollment in technical coding sprints & mock interview practice.',
      students: students.filter((s) => s.segment === 'Academic Focus (High CGPA, Low Placement)'),
      icon: BookOpen,
      badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    },
    {
      title: 'Tech Coders (Low CGPA, High Placement)',
      description: 'Exceptional hands-on developers and hackathon performers whose university GPA or attendance is at risk.',
      action: 'Academic tutoring to prevent backlog disqualification while preserving technical strengths.',
      students: students.filter((s) => s.segment === 'Tech Coders (Low CGPA, High Placement)'),
      icon: Terminal,
      badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    },
    {
      title: 'Critical Intervention (Dual Risk)',
      description: 'Students failing both academic attendance/marks criteria and placement readiness benchmarks.',
      action: 'Immediate faculty advisor 1-on-1 counseling and remedial coaching sessions.',
      students: students.filter((s) => s.segment === 'Critical Intervention (Dual Risk)'),
      icon: AlertOctagon,
      badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    },
    {
      title: 'Unknown (Insufficient Data)',
      description: 'Academic or placement inputs are missing, so this student is not assigned to a performance segment.',
      action: 'Complete the missing roster fields before assigning a performance segment.',
      students: students.filter((s) => s.segment === 'Unknown'),
      icon: CircleHelp,
      badgeColor: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Student Segmentation Matrix</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Quadrant grouping separating high academics vs placement readiness to trigger targeted institutional actions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {segments.map((seg, idx) => {
          const Icon = seg.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-800 bg-[#111827]/80 p-5 backdrop-blur-sm shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-800 text-indigo-400">
                      <Icon size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-white">{seg.title}</h3>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${seg.badgeColor}`}>
                    {seg.students.length} Students
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-3 leading-relaxed">{seg.description}</p>

                <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-0.5">
                    Recommended Action Plan
                  </span>
                  <p className="text-xs text-slate-300">{seg.action}</p>
                </div>
              </div>

              {/* Student list preview */}
              <div className="mt-4 pt-3 border-t border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500">Sample Cohort Members:</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {seg.students.slice(0, 5).map((st) => (
                    <span
                      key={st.id}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium"
                    >
                      {st.name} ({st.department.slice(0, 4)})
                    </span>
                  ))}
                  {seg.students.length > 5 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md text-slate-400">
                      +{seg.students.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
