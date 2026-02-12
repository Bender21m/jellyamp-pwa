import { NavLink } from 'react-router-dom'
import type { BaseItemDto } from '../../lib/jellyfin'

interface SidebarArtistItemProps {
  artist: BaseItemDto
}

export default function SidebarArtistItem({ artist }: SidebarArtistItemProps) {
  return (
    <NavLink
      to={`/artist/${artist.Id}`}
      className={({ isActive }) =>
        `relative block text-sm truncate py-1.5 px-4 rounded-md transition-all duration-200
        ${isActive
          ? 'text-neon-cyan bg-neon-cyan/5'
          : 'text-text-muted hover:text-text-primary hover:bg-white/5'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-neon-cyan shadow-[0_0_6px_rgba(0,255,221,0.4)]" />
          )}
          <span className="truncate block">{artist.Name ?? 'Unknown'}</span>
        </>
      )}
    </NavLink>
  )
}