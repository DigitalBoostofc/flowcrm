interface Props {
  className?: string;
}

export function Skeleton({ className = '' }: Props) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function StageSummarySkeleton() {
  return (
    <div className="glass rounded-xl p-4 space-y-2.5">
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="h-8 w-12" />
      <Skeleton className="h-2 w-16" />
    </div>
  );
}

export function LeadCardSkeleton() {
  return (
    <div className="glass rounded-xl p-3 space-y-2">
      <div className="flex justify-between gap-2">
        <Skeleton className="h-4 flex-1 max-w-[140px]" />
        <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
      </div>
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function LeadInfoSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-fade-up">
      <div className="space-y-2 pb-4" style={{ borderBottom: '1px solid var(--panel-border)' }}>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-36" />
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 py-3" style={{ borderBottom: '1px solid var(--panel-border)' }}>
            <Skeleton className="h-4 w-4 flex-shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
