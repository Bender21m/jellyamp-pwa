import { useState } from 'react'

interface JellyImageProps {
  src?: string
  itemId?: string
  serverUrl?: string
  tag?: string | null
  maxWidth?: number
  width: number
  height: number
  className?: string
  alt?: string
}

const MUSIC_NOTE_ICON = (
  <svg viewBox="0 0 24 24" className="w-1/3 h-1/3 text-text-muted/30" fill="currentColor">
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
  </svg>
)

export default function JellyImage({ src, itemId, serverUrl, tag, maxWidth, width, height, className = '', alt = '' }: JellyImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const imgSrc = src ?? (itemId && serverUrl
    ? `${serverUrl}/Items/${itemId}/Images/Primary?${new URLSearchParams({ maxWidth: (maxWidth ?? width).toString(), quality: '90', ...(tag ? { tag } : {}) })}`
    : undefined)

  if (!imgSrc || error) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width, height, backgroundColor: '#12121a' }}
      >
        {MUSIC_NOTE_ICON}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {!loaded && (
        <div className="absolute inset-0" style={{ backgroundColor: '#12121a' }} />
      )}
      <img
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover ${loaded ? '' : 'opacity-0'}`}
        style={{ transition: 'opacity 0.2s' }}
      />
    </div>
  )
}
