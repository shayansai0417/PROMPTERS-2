import { useState } from 'react';
import { LoaderCircle, Send } from 'lucide-react';
import { submitNaturalEntryAPI } from '@/lib/api';

type EntryLog = {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error' | 'pending';
};

export default function SmartEntryConsole({
  onApply,
}: {
  onApply: (students: unknown[]) => number;
}) {
  const [sentence, setSentence] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [logs, setLogs] = useState<EntryLog[]>([]);

  function appendLog(message: string, tone: EntryLog['tone']) {
    setLogs((current) => [...current, { id: Date.now() + current.length, message, tone }]);
  }

  async function submitEntry() {
    const instruction = sentence.trim();
    if (!instruction || submitting) return;

    setSubmitting(true);
    appendLog(`Parsing instruction: "${instruction}"`, 'pending');
    try {
      const result = await submitNaturalEntryAPI(instruction);
      const updatedCount = onApply(result.all_students);
      appendLog(
        `Applied updates to ${updatedCount} student record${updatedCount === 1 ? '' : 's'}. ${result.message}`,
        'success',
      );
      setSentence('');
    } catch (error) {
      appendLog(
        error instanceof Error ? error.message : 'Could not process the natural-language entry.',
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-indigo-500/25 bg-[#111827]/80 p-5 shadow-lg md:p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white">Smart Entry Console</h3>
        <p className="mt-1 text-sm text-slate-400">
          Describe a student record update in plain language.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={sentence}
          onChange={(event) => setSentence(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void submitEntry();
          }}
          disabled={submitting}
          placeholder="Update STU1001 attendance to 64% and set late assignments to 6"
          aria-label="Natural-language student update"
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => void submitEntry()}
          disabled={submitting || !sentence.trim()}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Send size={16} aria-hidden="true" />
          )}
          {submitting ? 'Processing…' : 'Process update'}
        </button>
      </div>

      <div
        className="mt-4 max-h-40 space-y-2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3 font-mono text-xs"
        role="log"
        aria-live="polite"
        aria-label="Natural-entry parsing updates"
      >
        {logs.length === 0 ? (
          <p className="text-slate-500">Parsing updates will appear here.</p>
        ) : (
          logs.map((entry) => (
            <p
              key={entry.id}
              className={
                entry.tone === 'success'
                  ? 'text-emerald-300'
                  : entry.tone === 'error'
                    ? 'text-rose-300'
                    : entry.tone === 'pending'
                      ? 'text-amber-300'
                      : 'text-slate-300'
              }
            >
              {entry.message}
            </p>
          ))
        )}
      </div>
    </section>
  );
}
