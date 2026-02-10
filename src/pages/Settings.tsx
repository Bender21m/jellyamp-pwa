import { useAuthStore } from '../stores/auth'

export default function Settings() {
  const { serverUrl, serverName, username, logout } = useAuthStore()

  return (
    <div className="h-full overflow-y-auto pb-48 md:pb-28">
      <div className="px-4 md:px-8 pt-5 md:pt-8 pb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em]">Settings</h1>
      </div>

      <div className="px-4 md:px-8 space-y-6 max-w-2xl">
        {/* Server Info */}
        <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-4">Server</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center min-h-[44px]">
              <span className="text-text-secondary text-sm">Server Name</span>
              <span className="text-sm font-mono">{serverName ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center min-h-[44px]">
              <span className="text-text-secondary text-sm">URL</span>
              <span className="text-sm font-mono text-text-muted truncate max-w-[200px]">{serverUrl}</span>
            </div>
            <div className="flex justify-between items-center min-h-[44px]">
              <span className="text-text-secondary text-sm">User</span>
              <span className="text-sm font-mono">{username}</span>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-4">About</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center min-h-[44px]">
              <span className="text-text-secondary text-sm">App</span>
              <span className="text-sm font-mono text-gradient">JellyAmp PWA</span>
            </div>
            <div className="flex justify-between items-center min-h-[44px]">
              <span className="text-text-secondary text-sm">Version</span>
              <span className="text-sm font-mono text-text-muted">0.1.0</span>
            </div>
          </div>
        </section>

        {/* Sign Out */}
        <div className="p-px rounded-xl bg-gradient-primary hover:shadow-[0_0_20px_rgba(0,255,221,0.15)] transition-shadow">
          <button
            onClick={logout}
            className="w-full py-3.5 rounded-[11px] bg-deep-black text-gradient font-semibold text-sm hover:bg-card transition-colors min-h-[48px]"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
