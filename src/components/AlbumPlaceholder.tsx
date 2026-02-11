import React from 'react'

function hashToHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  // Offset by 180 from artist placeholders to use a different hue range
  return (((hash % 360) + 360) % 360 + 180) % 360
}

interface AlbumPlaceholderProps {
  albumName: string
  artistName?: string
  className?: string
}

const AlbumPlaceholder = React.memo(function AlbumPlaceholder({
  albumName,
  artistName,
  className = '',
}: AlbumPlaceholderProps) {
  const hue = hashToHue(albumName)
  const hue2 = (hue + 40) % 360

  return (
    <div
      className={`flex flex-col items-center justify-center select-none p-3 overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 45%, 25%) 0%, hsl(${hue2}, 55%, 18%) 100%)`,
      }}
    >
      <span className="text-[11px] font-bold text-white/80 leading-tight text-center line-clamp-2 max-w-full">
        {albumName}
      </span>
      {artistName && (
        <span className="text-[9px] text-white/50 mt-1 truncate max-w-full">
          {artistName}
        </span>
      )}
    </div>
  )
})

export default AlbumPlaceholder
