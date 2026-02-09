import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import { usePlayerStore } from '../stores/player'
import logoSvg from '../assets/logo.svg'

const libraryNav = [
  { to: '/library', label: 'Library', icon: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z' },
  { to: '/search', label: 'Search', icon: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z' },
  { to: '/favorites', label: 'Favorites', icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' },
]

const playlistNav = [
  { to: '/playlists', label: 'Playlists', icon: 'M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z' },
]

const bottomNav = [
  { to: '/settings', label: 'Settings', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z' },
]

function NavItem({ item, collapsed }: { item: typeof libraryNav[0]; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-lg text-[14px] font-semibold transition-all duration-200 group
        ${collapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'}
        ${isActive
          ? 'bg-neon-cyan/8 text-neon-cyan'
          : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="sidebar-active"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-neon-cyan shadow-[0_0_8px_rgba(0,255,221,0.5)]"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          <svg viewBox="0 0 24 24" className={`w-5 h-5 shrink-0 ${isActive ? 'text-neon-cyan' : 'text-text-muted group-hover:text-text-secondary'}`} fill="currentColor">
            <path d={item.icon} />
          </svg>
          {!collapsed && <span>{item.label}</span>}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { username } = useAuthStore()
  const { currentTrack, setShowNowPlaying } = usePlayerStore()

  return (
    <aside className="hidden md:flex h-full flex-col bg-card/50 border-r border-white/5 backdrop-blur-sm shrink-0 overflow-hidden
      md:w-[72px] lg:w-[280px]">

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 lg:px-5 py-5 shrink-0">
        <div className="w-9 h-9 shrink-0" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 255, 221, 0.3))' }}>
          <img src={logoSvg} alt="JellyAmp" className="w-full h-full" />
        </div>
        <span className="hidden lg:block text-lg font-extrabold text-gradient tracking-[-0.03em]">
          JellyAmp
        </span>
      </div>

      {/* Separator */}
      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-neon-cyan/20 to-transparent" />

      {/* Library section */}
      <div className="px-2 lg:px-3 pt-4">
        <p className="hidden lg:block text-[11px] font-mono uppercase tracking-widest text-text-muted/60 px-4 mb-2">Library</p>
        <nav className="space-y-0.5">
          {libraryNav.map((item) => (
            <NavItem key={item.to} item={item} collapsed={false} />
          ))}
        </nav>
      </div>

      {/* Playlists section */}
      <div className="px-2 lg:px-3 pt-5">
        <p className="hidden lg:block text-[11px] font-mono uppercase tracking-widest text-text-muted/60 px-4 mb-2">Playlists</p>
        <nav className="space-y-0.5">
          {playlistNav.map((item) => (
            <NavItem key={item.to} item={item} collapsed={false} />
          ))}
        </nav>
      </div>

      <div className="flex-1" />

      {/* Now Playing mini (desktop only) */}
      {currentTrack && (
        <div className="hidden lg:block mx-3 mb-3">
          <div className="mx-1 mb-2 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          <button
            onClick={() => setShowNowPlaying(true)}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
          >
            {currentTrack.imageUrl && (
              <img src={currentTrack.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/10" />
            )}
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-semibold truncate group-hover:text-neon-cyan transition-colors">{currentTrack.name}</p>
              <p className="text-[11px] text-text-muted truncate">{currentTrack.artistName}</p>
            </div>
          </button>
        </div>
      )}

      {/* Settings + User */}
      <div className="px-2 lg:px-3 pb-2">
        {bottomNav.map((item) => (
          <NavItem key={item.to} item={item} collapsed={false} />
        ))}
      </div>

      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      <div className="px-3 lg:px-4 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple to-neon-pink flex items-center justify-center text-xs font-bold text-white shrink-0">
            {username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="hidden lg:block text-sm text-text-secondary truncate">
            {username}
          </span>
        </div>
      </div>
    </aside>
  )
}
