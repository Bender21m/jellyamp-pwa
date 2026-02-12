import { useState, useEffect } from 'react'
import { getShowsOnThisDay } from '../../lib/archive'
import type { ArchiveShow } from '../../lib/archive'
import SectionHeader from './SectionHeader'
import ShowGrid from './ShowGrid'
import SkeletonGrid from './SkeletonGrid'

function formatMonthDay(month: number, day: number): string {
  const d = new Date(2000, month - 1, day)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

export default function OnThisDaySection() {
  const [onThisDayShows, setOnThisDayShows] = useState<ArchiveShow[]>([])
  const [onThisDayTotal, setOnThisDayTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()

    setLoading(true)

    getShowsOnThisDay(month, day, { rows: 12 })
      .then((res) => {
        setOnThisDayShows(res.shows)
        setOnThisDayTotal(res.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const today = new Date()
  const todayLabel = formatMonthDay(today.getMonth() + 1, today.getDate())

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-3">
          📅 On This Day — {todayLabel}
        </h2>
        <SkeletonGrid />
      </div>
    )
  }

  if (onThisDayShows.length === 0) {
    return null
  }

  return (
    <SectionHeader title={`📅 On This Day — ${todayLabel}`} count={onThisDayTotal}>
      <ShowGrid shows={onThisDayShows} />
    </SectionHeader>
  )
}