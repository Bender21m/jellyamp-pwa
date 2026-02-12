import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'

interface NavItemProps {
  item: {
    to: string
    label: string
    icon: string
  }
  collapsed: boolean
}

export default function NavItem({ item, collapsed }: NavItemProps) {
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-lg text-[14px] font-semibold transition-all duration-200 group min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-neon-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card
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