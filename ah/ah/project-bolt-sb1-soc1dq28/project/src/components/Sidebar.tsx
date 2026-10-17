import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  SlidersHorizontal,
  CheckSquare,
  Sparkles,
  FileText,
  FileUp,
  Database,
  Activity,
} from 'lucide-react';
import type { ViewKey } from '@/types';

interface SidebarProps {
  active: ViewKey;
  onNavigate: (view: ViewKey) => void;
  onOpenUpload: () => void;
  onOpenSchema: () => void;
  allowedViews?: ViewKey[];
}

export default function Sidebar({
  active,
  onNavigate,
  onOpenUpload,
  onOpenSchema,
  allowedViews,
}: SidebarProps) {
  const mainNav = [
    { key: 'overview' as ViewKey, label: 'Overview', icon: LayoutDashboard },
    { key: 'students' as ViewKey, label: 'Students', icon: Users },
    { key: 'risk-analysis' as ViewKey, label: 'Risk Analysis', icon: AlertTriangle },
    { key: 'segments' as ViewKey, label: 'Segments', icon: SlidersHorizontal },
    { key: 'interventions' as ViewKey, label: 'Interventions', icon: CheckSquare },
    { key: 'llm-insights' as ViewKey, label: 'LLM Insights', icon: Sparkles },
    { key: 'lms-engagement' as ViewKey, label: 'LMS Engagement', icon: Activity },
    { key: 'reports' as ViewKey, label: 'Reports', icon: FileText },
  ];
  const visibleNav = allowedViews
    ? mainNav.filter((item) => allowedViews.includes(item.key))
    : mainNav;

  return (
    <aside className="w-64 shrink-0 bg-[#0c101c] border-r border-[#1e293b] flex flex-col min-h-screen z-30 select-none">
      {/* Brand Header */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-[#1e293b]/50">
        <div className="h-10 w-10 shrink-0 overflow-hidden flex items-center justify-center p-0.5 rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm">
          <img
            src="/cognitive-icon.png"
            alt="Cognitive Logo"
            className="h-full w-full object-cover rounded-xl"
          />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight leading-tight">COGNITIVE</h1>
          <p className="text-[11px] text-slate-400 font-medium">Student Success Analytics</p>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#4f46e5] text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {(!allowedViews || allowedViews.length > 3) && (
        <>
        {/* Data Management Section */}
        <div className="pt-5 pb-1 px-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Data Management
          </p>
        </div>

        <button
          onClick={onOpenUpload}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
        >
          <FileUp size={18} className="text-slate-400" />
          <span>Upload Data</span>
        </button>

        <button
          onClick={onOpenSchema}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
        >
          <Database size={18} className="text-slate-400" />
          <span>Data Schema</span>
        </button>

        <button
          onClick={() => onNavigate('pitch-deck')}
          aria-current={active === 'pitch-deck' ? 'page' : undefined}
          className={`mt-3 w-full flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-colors ${
            active === 'pitch-deck'
              ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
              : 'border-slate-700/70 bg-slate-900/40 text-amber-400 hover:border-amber-400/40 hover:bg-amber-400/5'
          }`}
        >
          <Sparkles
            size={18}
            className={active === 'pitch-deck' ? 'text-amber-300' : 'text-amber-400'}
          />
          <span>Pitch Deck (Slides)</span>
        </button>
        </>
        )}
      </div>

      {/* Bottom Campus Building Graphic Card */}
      <div className="p-3">
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-[#131b2e] to-[#0d1322] p-4 text-left shadow-lg">
          {/* Subtle dusk background illumination graphic */}
          <div className="relative h-20 w-full overflow-hidden rounded-xl mb-3 border border-indigo-500/20 bg-slate-900">
            {/* Campus building skyline illustration with glowing windows */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1020] via-[#1a1b38] to-[#2c2250] opacity-90" />
            <div className="absolute bottom-0 inset-x-0 flex justify-center items-end opacity-85">
              <svg viewBox="0 0 160 60" className="w-full h-16 text-indigo-400 fill-current opacity-70">
                {/* Central tower */}
                <rect x="68" y="10" width="24" height="50" rx="1" fill="#1e1b4b" stroke="#6366f1" strokeWidth="0.8" />
                <polygon points="68,10 80,0 92,10" fill="#4338ca" />
                {/* Windows */}
                <rect x="74" y="18" width="4" height="6" fill="#fef08a" />
                <rect x="82" y="18" width="4" height="6" fill="#fef08a" />
                <rect x="74" y="28" width="4" height="6" fill="#fef08a" />
                <rect x="82" y="28" width="4" height="6" fill="#fef08a" />
                {/* Wings */}
                <rect x="25" y="25" width="43" height="35" rx="1" fill="#1e1b4b" stroke="#6366f1" strokeWidth="0.6" />
                <rect x="35" y="32" width="4" height="5" fill="#fef08a" opacity="0.8" />
                <rect x="45" y="32" width="4" height="5" fill="#fef08a" opacity="0.8" />
                <rect x="55" y="32" width="4" height="5" fill="#fef08a" opacity="0.8" />
                <rect x="92" y="25" width="43" height="35" rx="1" fill="#1e1b4b" stroke="#6366f1" strokeWidth="0.6" />
                <rect x="101" y="32" width="4" height="5" fill="#fef08a" opacity="0.8" />
                <rect x="111" y="32" width="4" height="5" fill="#fef08a" opacity="0.8" />
                <rect x="121" y="32" width="4" height="5" fill="#fef08a" opacity="0.8" />
              </svg>
            </div>
            {/* Ambient amber glow */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 bg-amber-400/25 blur-md rounded-full pointer-events-none" />
          </div>

          <h3 className="text-xs font-bold text-white tracking-tight">Turn Data into</h3>
          <p className="text-xs font-bold text-white tracking-tight">Student Success</p>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">Predict. Support. Empower.</p>
        </div>
      </div>
    </aside>
  );
}
