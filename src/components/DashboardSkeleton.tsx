export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 lg:gap-8" aria-busy="true" aria-label="Loading weather">
      <div className="space-y-3">
        <div className="skeleton h-9 w-48" />
        <div className="skeleton h-4 w-64" />
        <div className="skeleton mt-6 h-24 w-56" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="flex flex-col gap-6 lg:col-span-2 lg:gap-8">
          <div className="skeleton h-72" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skeleton h-36" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-6 lg:gap-8">
          <div className="skeleton h-48" />
          <div className="skeleton h-[28rem]" />
        </div>
      </div>
    </div>
  );
}
