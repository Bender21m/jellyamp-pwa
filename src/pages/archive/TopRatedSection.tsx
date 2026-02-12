import { useState, useEffect } from 'react'
import { searchShows } from '../../lib/archive'
import type { ArchiveShow } from '../../lib/archive'
import SectionHeader from './SectionHeader'
import ShowGrid from './ShowGrid'
import SkeletonGrid from './SkeletonGrid'

export default function TopRatedSection() {
  const [topShows, setTopShows] = useState<ArchiveShow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    searchShows('', { rows: 12, sort: 'avg_rating desc' })
      .then((res) => setTopShows(res.shows.filter(s => s.rating && s.rating >= 4)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-3">
          ⭐ Top Rated Shows
        </h2>
        <SkeletonGrid />
      </div>
    )
  }

  if (topShows.length === 0) {
    return null
  }

  return (
    <SectionHeader title="⭐ Top Rated Shows">
      <ShowGrid shows={topShows} />
    </SectionHeader>
  )
}