import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
  role?: 'alert' | 'status';
}

export function EmptyState({ icon: Icon, title, body, action, role }: EmptyStateProps) {
  return (
    <div role={role} className="flex flex-col items-center px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-ink/[0.06] text-ink-2">
        <Icon className="size-6" strokeWidth={1.5} aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-3">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PrimaryButton({ className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-canvas transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-50 ${className}`}
    />
  );
}

export function GhostButton({ className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-line bg-ink/[0.04] px-3.5 text-sm font-medium text-ink-2 transition-colors hover:bg-ink/[0.08] hover:text-ink disabled:opacity-50 ${className}`}
    />
  );
}
