import { useState } from 'react';
import {
  ArrowDownToLine,
  CheckCircle2,
  CircleAlert,
  Database,
  GitBranch,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';

const slides = [
  {
    label: 'CHALLENGE STATEMENT',
    title: '1. Executive Problem & Solution Architecture',
    subtitle: 'From Disconnected Campus Silos to Unified Early Warning Intelligence',
    leftTitle: 'THE CAMPUS DILEMMA (BEFORE INFINITE COGNITION)',
    leftItems: [
      'Campus data is fragmented across disconnected academic, attendance, LMS, and placement silos.',
      'Departments work independently, making it difficult to coordinate timely student support.',
      'Student monitoring is delayed and often starts only after performance has declined.',
    ],
    rightTitle: 'INFINITE COGNITION DECISION INTELLIGENCE',
    rightItems: [
      'Real-time 360-degree analytics bring key student signals into one view.',
      'Predictive evaluation indexes identify emerging academic and placement risks.',
      'Closed-loop compliance monitoring workflows help teams track follow-through.',
    ],
    beneficiaries: ['Deans', 'HODs', 'Faculty Mentors', 'Students'],
    icon: Target,
  },
  {
    label: 'UNIFIED DATA FOUNDATION',
    title: '2. One Student, One Connected View',
    subtitle: 'A consistent student profile turns disconnected records into actionable context.',
    leftTitle: 'INPUTS FROM CAMPUS SYSTEMS',
    leftItems: [
      'Academic results, CGPA, internal marks, and active backlogs.',
      'Attendance and learning-platform activity, including logins and late work.',
      'Placement readiness signals such as aptitude, coding, and interview scores.',
    ],
    rightTitle: 'A TRUSTED STUDENT PROFILE',
    rightItems: [
      'Normalize common CSV and JSON fields into a consistent student record.',
      'Combine relevant indicators while preserving their original meaning.',
      'Make cohort health and individual context available from one dashboard.',
    ],
    beneficiaries: ['Data Teams', 'Deans', 'HODs', 'Faculty Mentors'],
    icon: Database,
  },
  {
    label: 'PREDICTIVE EARLY WARNING',
    title: '3. Identify Risk Before It Becomes a Crisis',
    subtitle: 'Explainable indicators make it easier to prioritize students who need support.',
    leftTitle: 'SIGNALS THAT NEED ATTENTION',
    leftItems: [
      'Attendance below the academic support threshold.',
      'Low CGPA or active backlogs that may affect progression.',
      'Placement scores or coding readiness below target benchmarks.',
    ],
    rightTitle: 'PRIORITIZED RISK VIEW',
    rightItems: [
      'Academic and placement risks are assessed separately and together.',
      'Cohort views surface patterns across departments and student groups.',
      'Clear risk indicators help staff focus attention where it can matter most.',
    ],
    beneficiaries: ['Deans', 'HODs', 'Faculty Mentors', 'Students'],
    icon: CircleAlert,
  },
  {
    label: 'CLOSED-LOOP INTERVENTION',
    title: '4. Move from Insight to Coordinated Action',
    subtitle: 'Make early signals useful with practical, trackable student support.',
    leftTitle: 'COORDINATED RESPONSE',
    leftItems: [
      'Faculty mentors review the context behind a student risk flag.',
      'Teams schedule a suitable intervention, from remedial support to counseling.',
      'Departments coordinate follow-up instead of relying on disconnected handoffs.',
    ],
    rightTitle: 'ACCOUNTABLE FOLLOW-THROUGH',
    rightItems: [
      'Record an owner, expected date, and current intervention status.',
      'Review progress and identify support that still needs attention.',
      'Use refreshed student data to guide the next decision.',
    ],
    beneficiaries: ['HODs', 'Faculty Mentors', 'Student Support Teams', 'Students'],
    icon: GitBranch,
  },
  {
    label: 'INSTITUTIONAL IMPACT',
    title: '5. Build a More Responsive Campus',
    subtitle: 'Shared visibility supports earlier decisions and more consistent student care.',
    leftTitle: 'FOR INSTITUTIONAL LEADERS',
    leftItems: [
      'Review cohort health and emerging risk trends in a shared dashboard.',
      'Compare academic, engagement, and placement readiness signals.',
      'Strengthen oversight with visible intervention status and ownership.',
    ],
    rightTitle: 'FOR EVERY STUDENT',
    rightItems: [
      'Receive support earlier, while there is time to make a difference.',
      'Benefit from coordinated guidance across academic and placement needs.',
      'Stay at the center of decisions informed by a fuller picture.',
    ],
    beneficiaries: ['Deans', 'HODs', 'Faculty Mentors', 'Students'],
    icon: ShieldCheck,
  },
];

function downloadSlideNote(slideIndex: number) {
  const slide = slides[slideIndex];
  const note = [
    slide.title,
    slide.subtitle,
    '',
    slide.leftTitle,
    ...slide.leftItems.map((item) => `- ${item}`),
    '',
    slide.rightTitle,
    ...slide.rightItems.map((item) => `- ${item}`),
    '',
    `Target Beneficiaries: ${slide.beneficiaries.join(', ')}`,
  ].join('\n');
  const url = URL.createObjectURL(new Blob([note], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `infinite-cognition-slide-${slideIndex + 1}-notes.txt`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function PitchDeck() {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = slides[activeSlide];
  const SlideIcon = slide.icon;

  return (
    <section className="mx-auto w-full max-w-6xl animate-fade-in">
      <div className="overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-br from-[#151b2d] via-[#101625] to-[#11101f] shadow-2xl shadow-black/30">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/60 px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/10 text-violet-300">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold tracking-tight text-white sm:text-base">
                Infinite Cognition Executive Presentation
              </h1>
              <p className="mt-0.5 text-[11px] text-slate-400">Campus decision intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200">
              Slide {activeSlide + 1} of {slides.length}
            </span>
            <button
              type="button"
              onClick={() => downloadSlideNote(activeSlide)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/70 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-violet-400/50 hover:bg-slate-700"
            >
              <ArrowDownToLine size={15} />
              <span className="hidden sm:inline">Export Note</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </header>

        <div className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <div className="mb-6">
            <span className="inline-flex items-center rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-violet-300">
              {slide.label}
            </span>
            <h2 className="mt-4 max-w-4xl text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
              {slide.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
              {slide.subtitle}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-950/30 to-[#17141e] p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <CircleAlert size={17} className="shrink-0 text-rose-400" />
                <h3 className="text-xs font-bold leading-relaxed tracking-wide text-rose-300 sm:text-sm">
                  {slide.leftTitle}
                </h3>
              </div>
              <ul className="space-y-3">
                {slide.leftItems.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-300">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-indigo-400/25 bg-gradient-to-br from-indigo-950/35 to-[#141729] p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <SlideIcon size={17} className="shrink-0 text-indigo-300" />
                <h3 className="text-xs font-bold leading-relaxed tracking-wide text-indigo-200 sm:text-sm">
                  {slide.rightTitle}
                </h3>
              </div>
              <ul className="space-y-3">
                {slide.rightItems.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-300">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-indigo-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/55 p-4 sm:grid-cols-[190px_1fr] sm:items-center sm:px-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Target size={16} className="text-amber-300" />
              <span>Target Beneficiaries:</span>
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              {slide.beneficiaries.map((beneficiary) => (
                <li
                  key={beneficiary}
                  className="flex items-center gap-2 text-xs text-slate-400"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {beneficiary}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-700/60 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2" aria-label="Choose a slide">
            {slides.map((item, index) => (
              <button
                key={item.label}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                aria-current={activeSlide === index ? 'step' : undefined}
                onClick={() => setActiveSlide(index)}
                className={`h-2.5 rounded-full transition-all ${
                  activeSlide === index
                    ? 'w-7 bg-violet-400'
                    : 'w-2.5 bg-slate-600 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSlide((current) => Math.max(0, current - 1))}
              disabled={activeSlide === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              &lt; Previous
            </button>
            <button
              type="button"
              onClick={() => setActiveSlide((current) => Math.min(slides.length - 1, current + 1))}
              disabled={activeSlide === slides.length - 1}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next &gt;
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
}
