import { Link, useLocation } from 'react-router-dom'

/**
 * Floating settings gear icon for mobile screens.
 * Replaces the Settings tab that was removed from MobileNav to keep
 * the bottom bar at 5 items (the standard mobile pattern).
 * Hidden on desktop (where Settings lives in the Sidebar).
 */
export default function MobileSettingsButton() {
  const location = useLocation()
  const isSettings = location.pathname === '/settings'

  return (
    <Link
      to="/settings"
      aria-label="Settings"
      className={`md:hidden fixed top-3 right-3 z-50 p-2 rounded-full backdrop-blur-md transition-colors ${
        isSettings
          ? 'text-neon-cyan bg-white/10'
          : 'text-text-muted bg-card/80 hover:text-text-primary hover:bg-white/10'
      }`}
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
      </svg>
    </Link>
  )
}
