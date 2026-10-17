export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function scoreGrade(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: 'text-emerald-400' };
  if (score >= 60) return { label: 'Good', color: 'text-sky-400' };
  if (score >= 40) return { label: 'Moderate', color: 'text-amber-400' };
  return { label: 'At Risk', color: 'text-rose-400' };
}
