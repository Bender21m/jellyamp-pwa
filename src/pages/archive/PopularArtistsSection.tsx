import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useArchiveStore } from '../../stores/archive'
import { getArtistInfo } from '../../lib/artistInfo'
import SectionHeader from './SectionHeader'

// Only artists verified to have substantial catalogs on archive.org/etree
const POPULAR_ARTISTS = [
  'Grateful Dead', 'Disco Biscuits', 'Widespread Panic',
  'String Cheese Incident', 'moe.', 'Phil Lesh', 'Max Creek',
  'Yonder Mountain String Band', 'Railroad Earth', 'Dark Star Orchestra',
  'Leftover Salmon', 'Keller Williams', 'Tedeschi Trucks Band',
  'Lotus', 'Galactic', 'New Riders of the Purple Sage',
  'Bob Weir', 'Pigeons Playing Ping Pong', 'Assembly of Dust',
]

// Generate a consistent color from artist name for avatar gradients
function artistColor(name: string): [string, string] {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const colors: [string, string][] = [
    ['from-cyan-500/20', 'to-teal-500/10'],
    ['from-violet-500/20', 'to-purple-500/10'],
    ['from-amber-500/20', 'to-orange-500/10'],
    ['from-emerald-500/20', 'to-green-500/10'],
    ['from-rose-500/20', 'to-pink-500/10'],
    ['from-sky-500/20', 'to-blue-500/10'],
    ['from-fuchsia-500/20', 'to-purple-500/10'],
  ]
  return colors[Math.abs(hash) % colors.length]
}

interface PopularArtistsSectionProps {
  defaultOpen?: boolean
}

export default function PopularArtistsSection({ defaultOpen }: PopularArtistsSectionProps) {
  const navigate = useNavigate()
  const { pinnedArtists, addRecentSearch } = useArchiveStore()
  const [artistImages, setArtistImages] = useState<Map<string, string>>(new Map())

  // Progressive loading with intersection observer
  useEffect(() => {
    let cancelled = false
    
    // Start with empty images (fallback logic removed)
    setArtistImages(new Map<string, string>())

    // Intersection observer for lazy loading enhanced images
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.target instanceof HTMLElement) {
            const artistName = entry.target.dataset.artist
            if (artistName && !cancelled) {
              // Unobserve to avoid re-triggering
              observer.unobserve(entry.target)
              
              // Fetch enhanced image data in background
              setTimeout(async () => {
                if (cancelled) return
                try {
                  const info = await getArtistInfo(artistName)
                  if (info?.imageUrl && !cancelled) {
                    setArtistImages(prev => new Map(prev).set(artistName, info.imageUrl!))
                  }
                } catch {
                  // Keep fallback or gradient
                }
              }, Math.random() * 2000) // Random delay to spread out requests
            }
          }
        })
      },
      { 
        rootMargin: '100px', // Load images when they're 100px away from viewport
        threshold: 0.1 
      }
    )

    // Store observer for cleanup
    ;(window as unknown as { __artistImageObserver: IntersectionObserver }).__artistImageObserver = observer
    
    return () => { 
      cancelled = true
      observer.disconnect()
    }
  }, [])

  const handleSelectArtist = (name: string) => {
    addRecentSearch(name)
    navigate(`/archive/artist/${encodeURIComponent(name)}`)
  }

  const isDefaultOpen = defaultOpen ?? pinnedArtists.length === 0

  return (
    <SectionHeader title="🎸 Popular Artists" defaultOpen={isDefaultOpen}>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {POPULAR_ARTISTS.map((name, i) => {
          const [from, to] = artistColor(name)
          const imgUrl = artistImages.get(name)
          return (
            <motion.button
              key={name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              onClick={() => handleSelectArtist(name)}
              data-artist={name}
              ref={(el) => {
                if (el && (window as unknown as { __artistImageObserver?: IntersectionObserver }).__artistImageObserver) {
                  (window as unknown as { __artistImageObserver: IntersectionObserver }).__artistImageObserver.observe(el)
                }
              }}
              className="shrink-0 w-[120px] text-center bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl p-3.5 transition-all duration-300 group border border-white/[0.04] hover:border-white/[0.08]"
            >
              <div className={`w-16 h-16 rounded-full mx-auto mb-2.5 ring-2 ring-white/10 group-hover:ring-neon-cyan/30 transition-all shadow-lg shadow-black/30 overflow-hidden ${!imgUrl ? `bg-gradient-to-br ${from} ${to} flex items-center justify-center` : ''}`}>
                {imgUrl ? (
                  <img src={imgUrl} alt="" className="w-full h-full object-cover transition-opacity duration-500" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <span className="text-xl font-bold text-white/60 group-hover:text-white/80 transition-colors">{name.charAt(0)}</span>
                )}
              </div>
              <p className="text-[13px] font-semibold text-text-primary group-hover:text-neon-cyan transition-colors line-clamp-2 leading-tight">
                {name}
              </p>
            </motion.button>
          )
        })}
      </div>
    </SectionHeader>
  )
}