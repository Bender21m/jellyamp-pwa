import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { fetchAlbums, getImageUrl } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'
import { parseShowDate } from '../lib/dateParser'

interface OnThisDayAlbum {
  id: string
  name: string
  imageUrl: string
  year: number
}

export default function OnThisDay() {
  const { api, userId, serverUrl } = useAuthStore()
  const [matches, setMatches] = useState<OnThisDayAlbum[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api || !userId || !serverUrl) return
    loadOnThisDay()
  }, [api, userId, serverUrl])

  async function loadOnThisDay() {
    if (!api || !userId || !serverUrl) return
    setLoading(true)
    try {
      const today = new Date()
      const todayMonth = today.getMonth() // 0-indexed
      const todayDay = today.getDate()

      // Fetch all albums (paginated)
      let allAlbums: BaseItemDto[] = []
      let startIndex = 0
      const pageSize = 500
      let hasMore = true

      while (hasMore) {
        const res = await fetchAlbums(api, userId, { limit: pageSize, startIndex })
        const items = res.Items ?? []
        allAlbums = allAlbums.concat(items)
        startIndex += items.length
        hasMore = items.length === pageSize
      }

      // Parse dates and filter to today's month/day
      const todayMatches: OnThisDayAlbum[] = []
      for (const album of allAlbums) {
        const date = parseShowDate(album.Name ?? '')
        if (date && date.getMonth() === todayMonth && date.getDate() === todayDay) {
          todayMatches.push({
            id: album.Id!,
            name: album.Name ?? 'Unknown',
            imageUrl: getImageUrl(serverUrl, album.Id!, album.ImageTags?.Primary, 80),
            year: date.getFullYear(),
          })
        }
      }

      // Sort by year descending
      todayMatches.sort((a, b) => b.year - a.year)
      setMatches(todayMatches)
    } catch (e) {
      console.error('On This Day failed:', e)
    }
    setLoading(false)
  }

  // Don't render anything if no matches or loading
  if (loading || matches.length === 0) return null

  return (
    <div className="hidden lg:block px-3 pt-5">
      <div className="mx-1 mb-2 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="flex items-center gap-2 px-4 mb-2">
        <span className="text-sm">📅</span>
        <p className="text-[11px] font-mono uppercase tracking-widest text-text-muted/60">On This Day</p>
      </div>
      <AnimatePresence>
        <nav className="space-y-0.5">
          {matches.slice(0, 5).map((album, i) => (
            <motion.div
              key={album.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/album/${album.id}`}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors group"
              >
                <img
                  src={album.imageUrl}
                  alt=""
                  className="w-8 h-8 rounded object-cover shrink-0 ring-1 ring-white/10"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate text-text-secondary group-hover:text-neon-cyan transition-colors">
                    {album.name}
                  </p>
                  <p className="text-[10px] text-text-muted font-mono">{album.year}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </nav>
      </AnimatePresence>
      {matches.length > 5 && (
        <p className="text-[10px] text-text-muted/50 px-4 pt-1">
          +{matches.length - 5} more
        </p>
      )}
    </div>
  )
}
