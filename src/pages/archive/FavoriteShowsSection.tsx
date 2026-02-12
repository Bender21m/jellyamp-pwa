import { useState, useEffect } from 'react'
import { useArchiveStore } from '../../stores/archive'
import type { FavoriteShowDetails } from '../../stores/archive'
import type { ArchiveShow } from '../../lib/archive'
import SectionHeader from './SectionHeader'
import ShowGrid from './ShowGrid'

export default function FavoriteShowsSection() {
  const { favoriteShows, favoriteShowDetails, cacheFavoriteShowDetails } = useArchiveStore()
  const [favShows, setFavShows] = useState<ArchiveShow[]>([])

  // Fetch favorite show metadata
  useEffect(() => {
    if (favoriteShows.length === 0) { 
      setFavShows([])
      return 
    }

    let cancelled = false
    const fetchFavs = async () => {
      const shows: ArchiveShow[] = []
      for (const id of favoriteShows) {
        const cached = favoriteShowDetails[id]
        if (cached) {
          shows.push({
            identifier: cached.identifier,
            title: `${cached.artist} — ${cached.date}`,
            artist: cached.artist,
            date: cached.date,
            venue: cached.venue,
            source: '',
            imageUrl: cached.imageUrl,
          })
        } else {
          try {
            const resp = await fetch(`https://archive.org/metadata/${id}`)
            const data = await resp.json()
            const m = data.metadata || {}
            const show: ArchiveShow = {
              identifier: id,
              title: m.title || id,
              artist: m.creator || m.artist || '',
              date: m.date?.slice(0, 10) || '',
              venue: m.venue || m.coverage || '',
              source: m.source || '',
              imageUrl: `https://archive.org/services/img/${id}`,
            }
            shows.push(show)
            const details: FavoriteShowDetails = {
              identifier: id,
              artist: show.artist,
              date: show.date,
              venue: show.venue,
              imageUrl: show.imageUrl,
            }
            cacheFavoriteShowDetails(details)
          } catch { /* skip */ }
        }
      }
      if (!cancelled) setFavShows(shows)
    }
    fetchFavs()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteShows.join(','), favoriteShowDetails, cacheFavoriteShowDetails])

  if (favShows.length === 0) {
    return null
  }

  return (
    <SectionHeader title="Favorite Shows" count={favShows.length}>
      <ShowGrid shows={favShows} />
    </SectionHeader>
  )
}