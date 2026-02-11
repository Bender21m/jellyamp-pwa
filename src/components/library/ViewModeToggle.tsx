import type { ViewMode, GridDensity } from '../../stores/ui'

interface ViewModeToggleProps {
  viewMode: ViewMode
  gridDensity: GridDensity
  setViewMode: (mode: ViewMode) => void
  setGridDensity: (density: GridDensity) => void
}

export default function ViewModeToggle({ viewMode, gridDensity, setViewMode, setGridDensity }: ViewModeToggleProps) {
  function handleGridToggle() {
    if (viewMode !== 'grid') {
      setViewMode('grid')
      return
    }
    // Already in grid — toggle density
    setGridDensity(gridDensity === 'normal' ? 'compact' : 'normal')
  }

  return (
    <div className="flex rounded-lg overflow-hidden border border-white/5 shrink-0">
      <button
        onClick={handleGridToggle}
        className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-neon-cyan text-deep-black' : 'bg-surface text-text-muted hover:text-text-primary'}`}
        title={viewMode === 'grid' ? (gridDensity === 'normal' ? 'Switch to compact grid' : 'Switch to large grid') : 'Grid view'}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          {gridDensity === 'compact' && viewMode === 'grid'
            ? <path d="M3 3h5v5H3V3zm7 0h5v5h-5V3zm7 0h5v5h-5V3zM3 10h5v5H3v-5zm7 0h5v5h-5v-5zm7 0h5v5h-5v-5zM3 17h5v5H3v-5zm7 0h5v5h-5v-5zm7 0h5v5h-5v-5z" />
            : <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
          }
        </svg>
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-neon-cyan text-deep-black' : 'bg-surface text-text-muted hover:text-text-primary'}`}
        title="List view"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
        </svg>
      </button>
    </div>
  )
}
