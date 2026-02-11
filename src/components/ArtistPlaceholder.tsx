import React from 'react'

function hashToHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return ((hash % 360) + 360) % 360
}

function getInitials(name: string): string {
  const cleaned = name.replace(/^the\s+/i, '').trim()
  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

interface ArtistPlaceholderProps {
  name: string
  className?: string
  /** Text size class, e.g. 'text-2xl' or 'text-sm' */
  textSize?: string
}

const ArtistPlaceholder = React.memo(function ArtistPlaceholder({
  name,
  className = '',
  textSize = 'text-2xl',
}: ArtistPlaceholderProps) {
  const hue = hashToHue(name)
  const initials = getInitials(name)

  return (
    <div
      className={`flex items-center justify-center select-none ${className}`}
      style={{ backgroundColor: `hsl(${hue}, 50%, 30%)` }}
    >
      <span className={`font-bold text-white/90 ${textSize}`}>{initials}</span>
    </div>
  )
})

export default ArtistPlaceholder
