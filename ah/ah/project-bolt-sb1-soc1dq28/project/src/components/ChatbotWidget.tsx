import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Bot,
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { fetchStudentsFromBackend } from '@/lib/api';
import { calculateStudentMetrics } from '@/lib/studentData';
import type { StudentRecord } from '@/types';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatbotWidgetProps {
  students?: StudentRecord[];
  onSendMessage?: (message: string) => Promise<string>;
}

const welcomeMessage: ChatMessage = {
  id: 0,
  role: 'assistant',
  content:
    'Hi! I can help you explore student performance, risks, and dashboard metrics. What would you like to know?',
};

function getRiskCounts(students: StudentRecord[]) {
  const categories = students.map((student) => calculateStudentMetrics(student).riskCategory);
  return {
    highRiskCount: categories.filter((category) => category === 'High Risk').length,
    mediumRiskCount: categories.filter((category) => category === 'Medium Risk').length,
    unknownRiskCount: categories.filter((category) => category === 'Unknown').length,
  };
}

function getAnalyticsResponse(query: string, students: StudentRecord[]): string | undefined {
  const normalizedQuery = query.toLowerCase();
  const hasAny = (terms: string[]) => terms.some((term) => normalizedQuery.includes(term));
  const { highRiskCount, mediumRiskCount, unknownRiskCount } = getRiskCounts(students);

  if (hasAny(['at risk', 'watchlist', 'danger'])) {
    return students.length === 0
      ? 'No student records are currently loaded, so risk indicators are not available.'
      : `${highRiskCount} of ${students.length} students are High Risk and require active intervention (2+ known threshold breaches). ${mediumRiskCount} are Medium Risk and should be monitored; ${unknownRiskCount} cannot be classified yet.`;
  }

  if (hasAny(['success', 'average', 'score'])) {
    if (students.length === 0) {
      return 'No student records are currently loaded, so the cohort success score is not available.';
    }
    const scores = students
      .map((student) => calculateStudentMetrics(student).successScore)
      .filter((score): score is number => score !== null);
    if (scores.length === 0) {
      return 'No success-score factors are available for the current cohort.';
    }
    const averageScore = scores.reduce((total, score) => total + score, 0) / scores.length;
    return `The weighted cohort success score currently stands at ${averageScore.toFixed(1)}% across ${scores.length} students with known factors.`;
  }

  if (hasAny(['students', 'count', 'how many'])) {
    return `There are currently ${students.length} active students loaded in the cohort roster.`;
  }

  return undefined;
}

function getGeneralResponse(query: string): string {
  const responses = [
    `Within the Infinite Cognition Executive Portal, "${query}" is best explored by connecting the relevant student signals with their cohort context. Review the dashboard indicators and intervention history to guide your next decision.`,
    `I’ve noted your question about "${query}". The portal is designed to bring academic, engagement, and placement signals together so campus teams can move from insight to coordinated student support.`,
    `That’s a useful area to explore. In Infinite Cognition, compare the relevant cohort metrics, inspect students who may need attention, and use the intervention workflow to track follow-through.`,
  ];
  const responseIndex = [...query].reduce((sum, character) => sum + character.charCodeAt(0), 0) % responses.length;
  return responses[responseIndex];
}

export default function ChatbotWidget({ students, onSendMessage }: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [backendStudents, setBackendStudents] = useState<StudentRecord[]>([]);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const activeStudents = students ?? backendStudents;

  useEffect(() => {
    if (!isOpen || students !== undefined || backendStudents.length > 0) return;
    let isCurrent = true;
    void fetchStudentsFromBackend().then((records) => {
      if (isCurrent && records) setBackendStudents(records);
    });
    return () => {
      isCurrent = false;
    };
  }, [backendStudents.length, isOpen, students]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isOpen]);

  function clearConversation() {
    requestIdRef.current += 1;
    setMessages([]);
    setIsResponding(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = input.trim();
    if (!query || isResponding) return;

    const requestId = ++requestIdRef.current;
    setInput('');
    setIsResponding(true);
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: 'user', content: query },
    ]);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 600));
      const reply =
        getAnalyticsResponse(query, activeStudents) ??
        (onSendMessage ? await onSendMessage(query) : getGeneralResponse(query));

      if (requestId !== requestIdRef.current) return;
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: 'assistant', content: reply },
      ]);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      const message =
        error instanceof Error
          ? `I couldn't get an answer: ${error.message}`
          : "I couldn't get an answer. Please try again.";
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: 'assistant', content: message },
      ]);
    } finally {
      if (requestId === requestIdRef.current) setIsResponding(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          aria-label="Campus Decision Assistant chat"
          className="flex h-[min(620px,calc(100vh-120px))] w-[min(400px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#0f172a] shadow-2xl shadow-black/50"
        >
          <header className="flex items-center gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/15 text-indigo-300">
              <Bot size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-bold text-white">
                Campus Decision Assistant
              </h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Online
              </p>
            </div>
            <button
              type="button"
              onClick={clearConversation}
              aria-label="Clear conversation"
              title="Clear conversation"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-rose-300"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              title="Close chat"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <X size={16} />
            </button>
          </header>

          <div
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                    <Sparkles size={14} />
                  </div>
                )}
                <div
                  className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    message.role === 'user'
                      ? 'rounded-br-md bg-slate-800 text-slate-100'
                      : 'rounded-bl-md border border-indigo-500/25 bg-indigo-950/50 text-slate-200'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isResponding && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Sparkles size={14} className="text-indigo-300" />
                AI is calculating...
              </div>
            )}
            <div ref={messageEndRef} />
          </div>

          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="border-t border-slate-800 bg-slate-900/60 p-3"
          >
            <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-[#0b1220] p-1.5 transition-colors focus-within:border-indigo-500/60">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about student performance, risks, or metrics..."
                aria-label="Message the Campus Decision Assistant"
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || isResponding}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? 'Close Campus Decision Assistant' : 'Open Campus Decision Assistant'}
        aria-expanded={isOpen}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-950/50 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f19]"
      >
        {isOpen ? <X size={23} /> : <MessageCircle size={23} />}
      </button>
    </div>
  );
}
