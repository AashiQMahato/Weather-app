import type { LucideIcon } from 'lucide-react';

interface PanelProps {
  title?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  id?: string;
}

export function Panel({ title, icon: Icon, action, className = '', children, id }: PanelProps) {
  return (
    <section id={id} aria-label={title} className={`panel p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex min-h-7 items-center justify-between gap-3">
          {title && (
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-3">
              {Icon && <Icon className="size-3.5" aria-hidden />}
              {title}
            </h2>
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
