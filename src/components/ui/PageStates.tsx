'use client';

import { CloudOff, RefreshCw } from 'lucide-react';
import { EmptyState, PrimaryButton } from './EmptyState';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 pt-6" aria-busy="true" aria-label="Loading weather">
      <div className="space-y-3">
        <div className="skeleton h-9 w-56" />
        <div className="skeleton h-4 w-72" />
        <div className="skeleton mt-6 h-32 w-64" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="skeleton h-56" />
          <div className="skeleton h-72" />
        </div>
        <div className="space-y-5">
          <div className="skeleton h-48" />
          <div className="skeleton h-96" />
        </div>
      </div>
    </div>
  );
}

export function WeatherError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="panel mx-auto mt-12 max-w-md">
      <EmptyState
        role="alert"
        icon={CloudOff}
        title="Couldn’t load the weather"
        body={message}
        action={
          <PrimaryButton onClick={onRetry}>
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </PrimaryButton>
        }
      />
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-4 sm:pt-8">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-ink-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}
