import { NavLink } from 'react-router-dom'
import { useArchiveStore } from '../stores/archive'
import { useAuthStore } from '../stores/auth'
import { usePlayerStore } from '../stores/player'
const baseTabs = [
  { to: '/library', label: 'Library', icon: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z' },
  { to: '/search', label: 'Search', icon: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z' },
  { to: '/favorites', label: 'Favorites', icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' },
  { to: '/history', label: 'History', icon: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z' },
]

const archiveOnlyTabs = [
  { to: '/archive', label: 'Archive', icon: 'M20 6H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM8 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm8 0c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z' },
  { to: '/settings', label: 'Settings', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.6 3.6 0 0112 15.6z' },
]

export default function MobileNav() {
  const archiveEnabled = useArchiveStore((s) => s.enabled)
  const archiveOnly = useAuthStore((s) => s.archiveOnly)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const showNowPlaying = usePlayerStore((s) => s.showNowPlaying)
  const playerAbove = !!currentTrack && !showNowPlaying
  
  // Archive-only mode shows limited tabs
  let tabs: typeof baseTabs
  if (archiveOnly) {
    tabs = archiveOnlyTabs
  } else {
    tabs = [...baseTabs]
    if (archiveEnabled) {
      tabs.splice(4, 0, {
        to: '/archive',
        label: 'Archive',
        icon: 'M20 6H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM8 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm8 0c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z'
      })
    }
  }
  return (
    <nav
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl ${
        playerAbove
          ? 'bg-[rgb(8,8,12)]/95'
          : 'bg-[rgb(8,8,12)]/95 shadow-[0_-1px_0_rgba(255,255,255,0.06)]'
      }`}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)', paddingTop: '4px' }}
    >
      <div className="flex items-stretch">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] min-w-[44px] transition-colors relative focus-visible:ring-2 focus-visible:ring-neon-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                isActive ? 'text-neon-cyan' : 'text-white/40'
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
                  <span className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neon-cyan shadow-[0_0_4px_rgba(0,255,221,0.6)]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
