import { AlertTriangle, CheckCircle2, Info, OctagonAlert, Sparkles } from 'lucide-react';
import type { Insight } from '@/lib/insights';
import { Panel } from './Panel';

const TONES = {
  good: { icon: CheckCircle2, className: 'text-good' },
  info: { icon: Info, className: 'text-info' },
  warning: { icon: AlertTriangle, className: 'text-warning' },
  critical: { icon: OctagonAlert, className: 'text-critical' },
} as const;

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <Panel title="Today’s tips" icon={Sparkles}>
      <ul className="space-y-3">
        {insights.slice(0, 4).map((insight) => {
          const { icon: Icon, className } = TONES[insight.tone];
          return (
            <li key={insight.id} className="flex gap-3 rounded-xl bg-white/5 p-3">
              <Icon className={`mt-0.5 size-4 shrink-0 ${className}`} aria-label={insight.tone} />
              <div>
                <p className="text-sm font-semibold">{insight.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{insight.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
