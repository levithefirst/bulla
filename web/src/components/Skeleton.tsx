export function Skel({ w = "100%", h = 14, r = 6, className = "" }: { w?: string | number; h?: number; r?: number; className?: string }) {
  return <span className={`skel ${className}`} style={{ width: w, height: h, borderRadius: r }} aria-hidden="true" />;
}

export function ReceiptSkeleton({ label }: { label: string }) {
  return (
    <div className="receipt-layout" aria-busy="true" data-testid="loading">
      <span className="sr-only" role="status">
        {label}
      </span>
      <div className="card receipt-card">
        <div className="row-between">
          <Skel w={160} h={28} />
          <Skel w={96} h={26} r={999} />
        </div>
        <Skel w="55%" h={16} className="mt-12" />
        <Skel w="45%" h={40} className="mt-24" />
        <div className="facts mt-24">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Skel w="40%" h={12} />
              <Skel w="80%" h={16} className="mt-8" />
            </div>
          ))}
        </div>
      </div>
      <div className="side">
        <div className="card">
          <Skel w="60%" h={18} />
          <Skel w="100%" h={40} className="mt-16" />
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="narrow" aria-busy="true">
      <span className="sr-only" role="status">
        Loading
      </span>
      <div className="card">
        <Skel w="50%" h={24} />
        <Skel w="90%" h={14} className="mt-16" />
        <Skel w="100%" h={40} className="mt-24" />
        <Skel w="100%" h={40} className="mt-16" />
      </div>
    </div>
  );
}
