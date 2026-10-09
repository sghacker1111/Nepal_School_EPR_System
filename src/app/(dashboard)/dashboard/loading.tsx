export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Loading workspace">
      <div className="space-y-2">
        <div className="h-3 w-28 rounded bg-slate-200" />
        <div className="h-8 w-72 rounded bg-slate-200" />
        <div className="h-4 w-full max-w-xl rounded bg-slate-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 rounded-xl border bg-white p-4">
            <div className="h-3 w-24 rounded bg-slate-100" />
            <div className="mt-4 h-8 w-16 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="h-80 rounded-xl border bg-white" />
    </div>
  );
}
