import { Calendar, User, Plus } from 'lucide-react';
import type { Intervention } from '@/types';

interface InterventionsProps {
  interventions: Intervention[];
  onOpenAdd: () => void;
}

export default function Interventions({ interventions, onOpenAdd }: InterventionsProps) {
  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Active Student Interventions</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Log and track remedial coaching, attendance counseling, and placement sprints.
          </p>
        </div>
        <button
          onClick={onOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
        >
          <Plus size={14} />
          <span>Add Intervention</span>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#111827]/80 overflow-hidden shadow-xl">
        {interventions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No active interventions recorded yet. Click &ldquo;Add Intervention&rdquo; to schedule one.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {interventions.map((item) => (
              <div key={item.id} className="p-4 hover:bg-slate-800/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{item.studentName}</span>
                    <span className="text-xs text-slate-400">({item.department})</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        item.status === 'Completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : item.status === 'In Progress'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-indigo-500/20 text-indigo-400'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} />
                      <span>{item.date}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <User size={13} />
                      <span>{item.assignedTo}</span>
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-xs">
                  <span className="font-semibold text-indigo-300">{item.type}: </span>
                  <span className="text-slate-300">{item.notes}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
