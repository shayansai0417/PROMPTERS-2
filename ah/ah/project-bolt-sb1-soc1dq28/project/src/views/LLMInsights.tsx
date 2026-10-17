import { useState } from 'react';
import { Sparkles, Brain, Target, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import type { StudentRecord } from '@/types';
import { fetchAIInsights } from '@/lib/api';

interface LLMInsightsProps {
  students: StudentRecord[];
  llmInsight: string;
}

export default function LLMInsights({ students, llmInsight }: LLMInsightsProps) {
  const [insight, setInsight] = useState(llmInsight);
  const [generating, setGenerating] = useState(false);
  const hasData = students.length > 0;
  const critical = students.filter((s) => s.academicRisk && s.placementRisk);
  const lowCodingHighGPA = students.filter(
    (s) => s.cgpa !== null && s.codingScore !== null && s.cgpa >= 8.0 && s.codingScore < 50,
  );

  const displayInsight = insight || llmInsight;

  async function handleGenerateAI() {
    setGenerating(true);
    try {
      const generated = await fetchAIInsights();
      if (generated) {
        setInsight(generated);
      }
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-indigo-400" size={20} />
            <h2 className="text-xl font-bold text-white tracking-tight">AI Decision Intelligence &amp; LLM Insights</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated executive briefings and predictive guidance for college deans and placement directors.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerateAI}
          disabled={generating}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
          <span>{generating ? 'Synthesizing with AI…' : 'Generate Executive Briefing'}</span>
        </button>
      </div>

      {/* Main Executive Summary Card */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-[#131b2e] via-[#0f172a] to-[#131b2e] p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0">
            <Brain size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white">Executive Synthesis for Academic Term</h3>
            {displayInsight.trim() ? (
              <div className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                {displayInsight}
              </div>
            ) : (
              <div
                role="status"
                className="mt-3 rounded-xl border border-indigo-400/20 bg-indigo-400/5 px-4 py-3 text-sm leading-relaxed text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <span>No executive summary cached yet. Click below to compile synthetic insights from the backend AI engine.</span>
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={generating}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white shrink-0"
                >
                  Generate Insights
                </button>
              </div>
            )}
          </div>
        </div>

        {hasData && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold mb-1">
                <AlertTriangle size={14} />
                <span>Immediate Priority</span>
              </div>
              <p className="text-xs text-slate-300">
                {critical.length} students exhibit dual academic &amp; placement risk. Recommend immediate mandatory counseling before semester examinations.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-1">
                <Target size={14} />
                <span>Placement Cell Action</span>
              </div>
              <p className="text-xs text-slate-300">
                Launch a 4-week dedicated Data Structures &amp; Algorithms sprint tailored for the {lowCodingHighGPA.length} students in the &ldquo;Academic Focus&rdquo; segment.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                <TrendingUp size={14} />
                <span>Curriculum Optimization</span>
              </div>
              <p className="text-xs text-slate-300">
                LMS assignment completion directly correlates with a +18% bump in mock interview clearing rates. Incentivize continuous weekly LMS tasks.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
