import type { LucideIcon } from 'lucide-react';

interface PanelProps {
  title: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function Panel({ title, icon: Icon, action, className = '', children }: PanelProps) {
  return (
    <section aria-label={title} className={`panel p-5 ${className}`}>
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
          {Icon && <Icon className="size-4" aria-hidden />}
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}
