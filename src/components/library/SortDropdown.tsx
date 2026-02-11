import { motion } from 'framer-motion'
import type { SortOption } from '../../stores/ui'

const sortLabels: Record<SortOption, string> = {
  'name-asc': 'Name A→Z',
  'name-desc': 'Name Z→A',
  'artist-asc': 'Artist A→Z',
  'artist-desc': 'Artist Z→A',
  'year-newest': 'Year ↓',
  'year-oldest': 'Year ↑',
  'date-added': 'Date Added',
}

const sortOptions: SortOption[] = ['name-asc', 'name-desc', 'artist-asc', 'artist-desc', 'year-newest', 'year-oldest', 'date-added']

interface SortDropdownProps {
  sortOption: SortOption
  setSortOption: (option: SortOption) => void
  showSort: boolean
  setShowSort: (show: boolean) => void
  isMobile?: boolean
}

export default function SortDropdown({ sortOption, setSortOption, showSort, setShowSort, isMobile = false }: SortDropdownProps) {
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setShowSort(!showSort)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-white/5 text-xs text-text-secondary hover:text-text-primary transition-colors font-mono"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
          <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" />
        </svg>
        <span>{sortLabels[sortOption]}</span>
      </button>
      {showSort && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setShowSort(false)} />
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`absolute ${isMobile ? 'left-0' : 'right-0'} top-full mt-1.5 bg-card border border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] py-1.5 z-30 min-w-[170px]`}
          >
            {sortOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => { setSortOption(opt); setShowSort(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  sortOption === opt ? 'text-neon-cyan bg-neon-cyan/5' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
              >
                {sortLabels[opt]}
              </button>
            ))}
          </motion.div>
        </>
      )}
    </div>
  )
}