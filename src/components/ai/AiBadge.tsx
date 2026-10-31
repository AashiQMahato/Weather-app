import { Sparkles } from 'lucide-react';

/** Gradient AI mark used by every AI surface. Pulses while thinking. */
export function AiBadge({ thinking = false, size = 'md' }: { thinking?: boolean; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'size-7 rounded-lg' : 'size-9 rounded-xl';
  return (
    <span className={`relative grid shrink-0 place-items-center bg-gradient-to-br from-sky-400 via-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/25 ${box}`} aria-hidden>
      {thinking && <span className={`absolute inset-0 animate-ping bg-indigo-400/40 ${box}`} />}
      <Sparkles className={size === 'sm' ? 'size-3.5' : 'size-[18px]'} />
    </span>
  );
}

export function SourceChip({ source, model }: { source: 'ai' | 'rules'; model: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-medium text-ink-3" title={model ?? undefined}>
      {source === 'ai' ? `AI · ${model?.split('/').pop() ?? 'Groq'}` : 'Automatic summary'}
    </span>
  );
}

export function ThinkingLines({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2.5" aria-label="Analysing the forecast" role="status">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton h-3.5" style={{ width: `${92 - i * 14}%` }} />
      ))}
    </div>
  );
}
