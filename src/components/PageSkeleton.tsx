/**
 * Lightweight loading skeleton shown while lazy-loaded pages are being fetched.
 * Matches the general page layout pattern (header area + content grid).
 */
export default function PageSkeleton() {
  return (
    <div className="h-full px-4 md:px-8 pt-5 md:pt-8 animate-pulse">
      {/* Title */}
      <div className="h-8 skeleton rounded-lg w-48 mb-2" />
      <div className="h-4 skeleton rounded w-32 mb-6" />

      {/* Filter pills */}
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 skeleton rounded-full w-20" />
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-square skeleton rounded-xl mb-2" />
            <div className="h-3.5 skeleton rounded w-3/4 mb-1" />
            <div className="h-3 skeleton rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
