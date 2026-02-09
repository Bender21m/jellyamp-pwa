import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/ui'

export default function Settings() {
  const { serverUrl, serverName, username, logout } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <div className="h-full overflow-y-auto pb-24">
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="px-6 space-y-6 max-w-2xl">
        {/* Server Info */}
        <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-4">Server</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-text-secondary text-sm">Server Name</span>
              <span className="text-sm font-mono">{serverName ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary text-sm">URL</span>
              <span className="text-sm font-mono text-text-muted truncate max-w-[200px]">{serverUrl}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary text-sm">User</span>
              <span className="text-sm font-mono">{username}</span>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-4">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Compact Sidebar</p>
              <p className="text-xs text-text-muted">Collapse the sidebar to icons only</p>
            </div>
            <button
              onClick={toggleSidebar}
              className={`w-11 h-6 rounded-full transition-colors relative ${sidebarCollapsed ? 'bg-neon-cyan' : 'bg-surface'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${sidebarCollapsed ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </section>

        {/* About */}
        <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-4">About</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-text-secondary text-sm">App</span>
              <span className="text-sm font-mono text-gradient">JellyAmp PWA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary text-sm">Version</span>
              <span className="text-sm font-mono text-text-muted">0.1.0</span>
            </div>
          </div>
        </section>

        {/* Sign Out */}
        <button
          onClick={logout}
          className="w-full py-3 rounded-xl bg-neon-pink/10 border border-neon-pink/20 text-neon-pink font-semibold text-sm hover:bg-neon-pink/20 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
