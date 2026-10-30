'use client';

import { useEffect } from 'react';
import { CloudLightning } from 'lucide-react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div data-scene="storm" className="sky grid min-h-dvh place-items-center px-4">
      <div className="panel flex max-w-md flex-col items-center p-10 text-center" role="alert">
        <CloudLightning className="size-12 text-ink-2" strokeWidth={1.25} aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-2">An unexpected error occurred. Please try again.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-semibold text-slate-900 transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
