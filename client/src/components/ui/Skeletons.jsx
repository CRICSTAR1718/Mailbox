// Loading placeholders that mirror the real layouts so the page doesn't jump when data arrives.
const SENDER_WIDTHS = [110, 140, 90, 125, 100, 150, 95, 130, 115, 105];
const SUBJECT_WIDTHS = ['62%', '48%', '71%', '55%', '66%', '44%', '58%', '69%', '51%', '63%'];

function Bar({ className = '', style }) {
  return <span aria-hidden="true" className={`skeleton block ${className}`} style={style} />;
}

export function ListSkeleton({ stacked = false, rows = 12 }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading messages">
      {Array.from({ length: rows }, (_, i) =>
        stacked ? (
          <div key={i} className="flex items-start gap-3 border-b border-row px-3 py-3">
            <Bar className="mt-1 size-[18px] shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4">
                <Bar className="h-3.5" style={{ width: SENDER_WIDTHS[i % 10] }} />
                <Bar className="h-3 w-10" />
              </div>
              <Bar className="mt-2 h-3.5" style={{ width: SUBJECT_WIDTHS[i % 10] }} />
              <Bar className="mt-2 h-3 w-[80%]" />
            </div>
          </div>
        ) : (
          <div key={i} className="flex h-[var(--row-h)] items-center gap-3 border-b border-row pr-4 pl-3">
            <Bar className="size-[18px] shrink-0" />
            <Bar className="size-5 shrink-0 rounded-full" />
            <Bar className="mr-4 h-3.5 shrink-0" style={{ width: SENDER_WIDTHS[i % 10] }} />
            <Bar className="h-3.5" style={{ width: SUBJECT_WIDTHS[i % 10] }} />
            <span className="flex-1" />
            <Bar className="h-3 w-12" />
          </div>
        )
      )}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function ThreadSkeleton({ narrow = false }) {
  const pad = narrow ? 'px-4' : 'pr-6 pl-[72px]';
  return (
    <div role="status" aria-busy="true" aria-label="Loading conversation">
      <div className={`${pad} pb-4`}>
        <Bar className="h-6 w-[55%]" />
        <div className="mt-3 flex gap-2">
          <Bar className="h-5 w-14" />
          <Bar className="h-5 w-20" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="border-t border-line px-4 py-5">
          <div className="flex items-center gap-4">
            <Bar className="size-10 shrink-0 rounded-full" />
            <div className="flex-1">
              <Bar className="h-3.5 w-44" />
              <Bar className="mt-2 h-3 w-24" />
            </div>
            <Bar className="h-3 w-28" />
          </div>
          {i === 2 && (
            <div className={`mt-5 space-y-2 ${narrow ? '' : 'pl-14'}`}>
              <Bar className="h-3.5 w-[90%]" />
              <Bar className="h-3.5 w-[80%]" />
              <Bar className="h-3.5 w-[60%]" />
            </div>
          )}
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
