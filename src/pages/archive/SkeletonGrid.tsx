interface SkeletonGridProps {
  count?: number
}

export default function SkeletonGrid({ count = 6 }: SkeletonGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.04]">
          <div className="flex gap-4">
            <div className="w-[72px] h-[72px] skeleton rounded-xl shrink-0" />
            <div className="flex-1 space-y-2.5 py-1">
              <div className="h-3 skeleton rounded w-2/5" />
              <div className="h-4 skeleton rounded w-3/5" />
              <div className="h-3 skeleton rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}