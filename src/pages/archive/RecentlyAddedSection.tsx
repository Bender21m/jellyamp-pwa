import { useState, useEffect } from 'react'
import { getRecentlyAdded } from '../../lib/archive'
import type { ArchiveShow } from '../../lib/archive'
import SectionHeader from './SectionHeader'
import ShowGrid from './ShowGrid'
import SkeletonGrid from './SkeletonGrid'

export default function RecentlyAddedSection() {
  const [recentlyAdded, setRecentlyAdded] = useState<ArchiveShow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    getRecentlyAdded({ rows: 12 })
      .then((shows) => setRecentlyAdded(shows))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-3">
          🆕 Just Added
        </h2>
        <SkeletonGrid />
      </div>
    )
  }

  if (recentlyAdded.length === 0) {
    return null
  }

  return (
    <SectionHeader title="🆕 Just Added">
      <ShowGrid shows={recentlyAdded} />
    </SectionHeader>
  )
}