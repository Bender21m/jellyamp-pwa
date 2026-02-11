interface SkeletonGridProps {
  viewMode: string
  type: string
}

export default function SkeletonGrid({ viewMode, type }: SkeletonGridProps) {
  if (viewMode === 'list') {
    return (
      <div className="space-y-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-3 py-2.5 min-h-[56px]">
            <div className={`${type === 'artist' ? 'w-12 h-12 rounded-xl' : 'w-14 h-14 rounded-xl'} skeleton`} />
            <div className="flex-1 space-y-2">
              <div className="h-4 skeleton rounded w-1/3" />
              {type !== 'artist' && <div className="h-3.5 skeleton rounded w-1/5" />}
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5 md:gap-6 lg:gap-7">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i}>
          <div className="aspect-square rounded-xl skeleton mb-3" />
          <div className="h-4 skeleton rounded w-3/4 mb-2" />
          <div className="h-3.5 skeleton rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}