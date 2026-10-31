import Link from 'next/link';
import { CloudFog } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="panel mx-auto mt-16 flex max-w-md flex-col items-center p-10 text-center">
      <CloudFog className="size-12 text-ink-2" strokeWidth={1.25} aria-hidden />
      <p className="tabular mt-4 text-sm font-semibold text-ink-3">404</p>
      <h1 className="mt-1 text-2xl font-semibold">Lost in the fog</h1>
      <p className="mt-2 text-sm text-ink-2">The page you’re looking for doesn’t exist.</p>
      <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-canvas transition-opacity hover:opacity-90">
        Back to today
      </Link>
    </div>
  );
}
