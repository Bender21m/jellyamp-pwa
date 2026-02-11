import type { ViewMode, GridDensity } from '../../stores/ui'

interface ViewModeToggleProps {
  viewMode: ViewMode
  gridDensity: GridDensity
  setViewMode: (mode: ViewMode) => void
  setGridDensity: (density: GridDensity) => void
}

const gridDensityIcons = {
  normal: <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />,
  compact: <path d="M3 3h5v5H3V3zm7 0h5v5h-5V3zm7 0h5v5h-5V3zM3 10h5v5H3v-5zm7 0h5v5h-5v-5zm7 0h5v5h-5v-5zM3 17h5v5H3v-5zm7 0h5v5h-5v-5zm7 0h5v5h-5v-5z" />,
  dense: <path d="M2 2h3v3H2V2zm4 0h3v3H6V2zm4 0h3v3h-3V2zm4 0h3v3h-3V2zm4 0h3v3h-3V2zm-16 4h3v3H2V6zm4 0h3v3H6V6zm4 0h3v3h-3V6zm4 0h3v3h-3V6zm4 0h3v3h-3V6zm-16 4h3v3H2v-3zm4 0h3v3H6v-3zm4 0h3v3h-3v-3zm4 0h3v3h-3v-3zm4 0h3v3h-3v-3zm-16 4h3v3H2v-3zm4 0h3v3H6v-3zm4 0h3v3h-3v-3zm4 0h3v3h-3v-3zm4 0h3v3h-3v-3zm-16 4h3v3H2v-3zm4 0h3v3H6v-3zm4 0h3v3h-3v-3zm4 0h3v3h-3v-3zm4 0h3v3h-3v-3z" />
}

export default function ViewModeToggle({ viewMode, gridDensity, setViewMode, setGridDensity }: ViewModeToggleProps) {
  const cycleGridDensity = () => {
    const densities: GridDensity[] = ['normal', 'compact', 'dense']
    const currentIndex = densities.indexOf(gridDensity)
    const nextIndex = (currentIndex + 1) % densities.length
    setGridDensity(densities[nextIndex])
  }

  return (
    <div className="flex rounded-lg overflow-hidden border border-white/5 shrink-0">
      <button
        onClick={() => viewMode === 'grid' ? cycleGridDensity() : setViewMode('grid')}
        className={`p-2 transition-colors relative ${viewMode === 'grid' ? 'bg-neon-cyan text-deep-black' : 'bg-surface text-text-muted hover:text-text-primary'}`}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          {viewMode === 'grid' ? gridDensityIcons[gridDensity] : gridDensityIcons.normal}
        </svg>
        {viewMode === 'grid' && (
          <span className="absolute -top-1 -right-1 text-[8px] leading-none font-mono bg-neon-cyan text-deep-black rounded-full w-3 h-3 flex items-center justify-center">
            {gridDensity === 'normal' ? '2' : gridDensity === 'compact' ? '3' : '4'}
          </span>
        )}
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-neon-cyan text-deep-black' : 'bg-surface text-text-muted hover:text-text-primary'}`}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
        </svg>
      </button>
    </div>
  )
}