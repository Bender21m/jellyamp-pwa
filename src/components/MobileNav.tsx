import { NavLink } from 'react-router-dom'
import { useArchiveStore } from '../stores/archive'
import { usePlayerStore } from '../stores/player'
const baseTabs = [
  { to: '/library', label: 'Library', icon: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z' },
  { to: '/search', label: 'Search', icon: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z' },
  { to: '/favorites', label: 'Favorites', icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' },
  { to: '/history', label: 'History', icon: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z' },
]

export default function MobileNav() {
  const archiveEnabled = useArchiveStore((s) => s.enabled)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const showNowPlaying = usePlayerStore((s) => s.showNowPlaying)
  const playerBarVisible = !!currentTrack && !showNowPlaying
  
  // Add Archive tab after History (before Settings) when enabled
  const tabs = [...baseTabs]
  if (archiveEnabled) {
    tabs.splice(4, 0, {
      to: '/archive',
      label: 'Archive',
      icon: 'M20 6H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM8 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm8 0c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z'
    })
  }
  return (
    <nav
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl ${
        playerBarVisible ? 'bg-card/90' : 'bg-card/95 border-t border-white/10'
      }`}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      {/* Gradient top line — only when player bar is NOT above */}
      {!playerBarVisible && <div className="h-px bg-gradient-primary opacity-40" />}
      <div className="flex items-stretch">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] transition-colors relative ${
                isActive ? 'text-neon-cyan' : 'text-text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                  <path d={tab.icon} />
                </svg>
                <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
                {isActive && (
                  <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neon-cyan shadow-[0_0_4px_rgba(0,255,221,0.6)]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
