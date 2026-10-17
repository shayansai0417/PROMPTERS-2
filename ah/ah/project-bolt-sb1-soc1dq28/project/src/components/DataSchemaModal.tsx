import { X, Database } from 'lucide-react';
import riskConfig from '../../../../../risk_config.json';

interface DataSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DataSchemaModal({ isOpen, onClose }: DataSchemaModalProps) {
  if (!isOpen) return null;

  const categories = [
    {
      category: `1. Academic (${riskConfig.successScoreWeights.academic * 100}% nominal weight)`,
      fields: 'CGPA (0-10), Active Backlogs, Internal Assessment Marks',
      role: 'Academic score uses known CGPA scaled to 0-100; missing values are excluded.',
    },
    {
      category: `2. Attendance (${riskConfig.successScoreWeights.attendance * 100}% nominal weight)`,
      fields: 'Overall Attendance %, Subject-wise Attendance',
      role: `Attendance below ${riskConfig.riskThresholds.attendancePercentBelow}% is one configurable risk factor.`,
    },
    {
      category: `3. LMS Engagement (${riskConfig.successScoreWeights.lms * 100}% nominal weight)`,
      fields: 'Assignment Completion %, Weekly Login Frequency',
      role: `Fewer than ${riskConfig.riskThresholds.lmsLoginsBelow} logins is one configurable risk factor.`,
    },
    {
      category: `4. Placement Readiness (${riskConfig.successScoreWeights.placement * 100}% nominal weight)`,
      fields: 'Aptitude Score %, Coding Score %, Mock Interview Score %',
      role: 'Placement score averages only available aptitude, coding, and mock interview measures.',
    },
    {
      category: '5. Skills & Extracurriculars',
      fields: 'Technical Certifications, Hackathon Participations',
      role: 'Used for bonus profile enrichment and segmentation tagging.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-indigo-500/20 bg-[#0f172a] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
              <Database size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Smart Campus Data Schema</h3>
              <p className="text-xs text-slate-400">Multi-source unified data model &amp; scoring weights</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Formula Callout */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-4">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
              Composite Success Score Formula
            </h4>
            <div className="mt-2 font-mono text-xs text-slate-200 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              Success Score = weighted average of available factors; weights are renormalized when values are missing.
            </div>
            <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
              Academic = CGPA × 10; LMS uses completion rate or login activity; placement averages available aptitude, coding, and mock interview scores. Unknown metrics are excluded.
            </p>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Data Domain</th>
                  <th className="py-2.5 px-3">Indicators / Metrics</th>
                  <th className="py-2.5 px-3">Predictive Significance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {categories.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">{c.category}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-indigo-300">{c.fields}</td>
                    <td className="py-2.5 px-3 text-slate-400">{c.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Risk Rules */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-2">
            <h4 className="text-xs font-bold text-white">Configurable Risk Classification</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/20 text-slate-300">
                <span className="font-semibold text-rose-400">High Risk:</span> At least {riskConfig.riskThresholds.highRiskFactorCount} known factors breach thresholds.
              </div>
              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/20 text-slate-300">
                <span className="font-semibold text-amber-400">Medium Risk:</span> One known factor breaches a threshold; Low Risk means no known breaches.
              </div>
              <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-slate-300">
                <span className="font-semibold text-indigo-300">Thresholds:</span> Attendance &lt; {riskConfig.riskThresholds.attendancePercentBelow}%, CGPA &lt; {riskConfig.riskThresholds.cgpaBelow}, LMS logins &lt; {riskConfig.riskThresholds.lmsLoginsBelow}, late assignments &gt; {riskConfig.riskThresholds.lateAssignmentsAbove}.
              </div>
              <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300">
                <span className="font-semibold text-slate-200">Unknown:</span> No risk classification is assigned when every risk input is missing.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/40 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
