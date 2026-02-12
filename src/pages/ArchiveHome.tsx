import { useState, useEffect, useCallback } from 'react'
import { searchArtists, searchShows } from '../lib/archive'
import type { ArchiveShow } from '../lib/archive'
import ArchiveHeader from './archive/ArchiveHeader'
import SearchResultsSection from './archive/SearchResultsSection'
import PinnedArtistsSection from './archive/PinnedArtistsSection'
import PopularArtistsSection from './archive/PopularArtistsSection'
import FavoriteShowsSection from './archive/FavoriteShowsSection'
import OnThisDaySection from './archive/OnThisDaySection'
import RecentlyAddedSection from './archive/RecentlyAddedSection'
import TopRatedSection from './archive/TopRatedSection'

export default function ArchiveHome() {
  const [query, setQuery] = useState('')
  const [searchMode, setSearchMode] = useState<'artists' | 'shows'>('artists')
  const [results, setResults] = useState<{ name: string; showCount: number }[]>([])
  const [showResults, setShowResults] = useState<ArchiveShow[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)

  const doSearch = useCallback(async (q: string, mode: 'artists' | 'shows') => {
    if (!q.trim()) {
      setResults([])
      setShowResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      if (mode === 'shows') {
        const res = await searchShows(q.trim(), { rows: 24 })
        setShowResults(res.shows)
        setResults([])
      } else {
        const res = await searchArtists(q.trim())
        setResults(res)
        setShowResults([])
      }
    } catch {
      setResults([])
      setShowResults([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => doSearch(query, searchMode), 300)
    return () => clearTimeout(t)
  }, [query, searchMode, doSearch])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <ArchiveHeader
        query={query}
        setQuery={setQuery}
        searchMode={searchMode}
        setSearchMode={setSearchMode}
        inputFocused={inputFocused}
        setInputFocused={setInputFocused}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-48 md:pb-28">
        <SearchResultsSection
          query={query}
          searchMode={searchMode}
          loading={loading}
          searched={searched}
          results={results}
          showResults={showResults}
        />

        {!query.trim() && (
          <>
            {/* Pinned artists */}
            <PinnedArtistsSection />

            {/* Popular Artists — always visible, horizontal scroll */}
            <PopularArtistsSection />

            {/* Favorite shows */}
            <FavoriteShowsSection />

            {/* On This Day */}
            <OnThisDaySection />

            {/* Recently Added */}
            <RecentlyAddedSection />

            {/* Top Rated */}
            <TopRatedSection />
          </>
        )}
      </div>
    </div>
  )
}