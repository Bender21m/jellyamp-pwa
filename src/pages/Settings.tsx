import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/ui'
import type { AudioQuality, CrossfadeMode } from '../stores/ui'
import { validateListenBrainzToken, startLastFmAuth } from '../lib/scrobble'
import { getCacheSize, clearAllCache, formatCacheSize } from '../lib/offlineCache'

const QUALITY_OPTIONS: { value: AudioQuality; label: string; desc: string }[] = [
  { value: 'original', label: 'Original', desc: 'Lossless / Direct stream' },
  { value: 'high', label: 'High', desc: '320 kbps MP3' },
  { value: 'medium', label: 'Medium', desc: '192 kbps MP3' },
  { value: 'low', label: 'Low', desc: '128 kbps MP3' },
]

const CROSSFADE_OPTIONS: { value: CrossfadeMode; label: string; desc: string }[] = [
  { value: 'gapless', label: 'Gapless', desc: 'Seamless transitions — perfect for live recordings' },
  { value: 'crossfade', label: 'Crossfade', desc: 'Smooth fade between tracks' },
  { value: 'off', label: 'Off', desc: 'Standard playback with natural gaps' },
]

const SPEED_OPTIONS: { value: number; label: string }[] = [
  { value: 0.5, label: '0.5×' },
  { value: 0.75, label: '0.75×' },
  { value: 1, label: '1×' },
  { value: 1.25, label: '1.25×' },
  { value: 1.5, label: '1.5×' },
  { value: 2, label: '2×' },
]

export default function Settings() {
  const { serverUrl, serverName, username, logout } = useAuthStore()
  const { audioQuality, setAudioQuality, crossfadeMode, setCrossfadeMode, crossfadeDuration, setCrossfadeDuration, playbackSpeed, setPlaybackSpeed, scrobbleSettings, updateScrobbleSettings } = useUIStore()
  
  const [lastfmApiKey, setLastfmApiKey] = useState(scrobbleSettings.lastfm.apiKey)
  const [listenbrainzToken, setListenbrainzToken] = useState(scrobbleSettings.listenbrainz.token)
  const [isConnectingLastfm, setIsConnectingLastfm] = useState(false)
  const [lastfmStatus, setLastfmStatus] = useState('')
  const [listenbrainzStatus, setListenbrainzStatus] = useState('')
  const [cacheSize, setCacheSize] = useState(0)
  const [clearingCache, setClearingCache] = useState(false)

  // Load cache size on component mount
  useEffect(() => {
    loadCacheSize()
  }, [])

  async function loadCacheSize() {
    try {
      const size = await getCacheSize()
      setCacheSize(size)
    } catch (error) {
      console.error('Failed to get cache size:', error)
    }
  }

  async function handleClearCache() {
    setClearingCache(true)
    try {
      await clearAllCache()
      setCacheSize(0)
    } catch (error) {
      console.error('Failed to clear cache:', error)
    } finally {
      setClearingCache(false)
    }
  }

  // Handle Last.fm API key and authentication
  const handleLastfmApiKeySubmit = () => {
    if (!lastfmApiKey.trim()) return
    updateScrobbleSettings({
      lastfm: { ...scrobbleSettings.lastfm, apiKey: lastfmApiKey.trim() }
    })
    setLastfmStatus('API key saved')
  }

  const handleLastfmConnect = async () => {
    if (!scrobbleSettings.lastfm.apiKey) {
      setLastfmStatus('Please enter API key first')
      return
    }
    
    setIsConnectingLastfm(true)
    try {
      const authUrl = await startLastFmAuth(scrobbleSettings.lastfm.apiKey)
      window.open(authUrl, '_blank')
      setLastfmStatus('Complete authorization in the popup window')
    } catch (error) {
      setLastfmStatus('Error: Invalid API key')
    } finally {
      setIsConnectingLastfm(false)
    }
  }

  // Handle ListenBrainz token validation
  const handleListenbrainzTokenSubmit = async () => {
    if (!listenbrainzToken.trim()) return
    
    try {
      const username = await validateListenBrainzToken(listenbrainzToken.trim())
      updateScrobbleSettings({
        listenbrainz: { 
          token: listenbrainzToken.trim(),
          username 
        }
      })
      setListenbrainzStatus(`Connected as ${username}`)
    } catch (error) {
      setListenbrainzStatus('Error: Invalid token')
    }
  }

  // Toggle scrobbling
  const toggleScrobbling = () => {
    updateScrobbleSettings({ enabled: !scrobbleSettings.enabled })
  }

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

        {/* Audio Quality */}
        <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-4">Streaming Quality</h2>
          <div className="space-y-1.5">
            {QUALITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAudioQuality(opt.value)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all text-left ${
                  audioQuality === opt.value
                    ? 'bg-neon-cyan/[0.08] ring-1 ring-neon-cyan/30'
                    : 'hover:bg-white/5'
                }`}
              >
                <div>
                  <span className={`text-sm font-semibold ${audioQuality === opt.value ? 'text-neon-cyan' : 'text-text-primary'}`}>
                    {opt.label}
                  </span>
                  <p className="text-xs text-text-muted mt-0.5">{opt.desc}</p>
                </div>
                {audioQuality === opt.value && (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-neon-cyan shrink-0" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted/60 mt-3 px-1">
            Original streams the file as-is (FLAC, WAV, etc). Lower quality saves bandwidth but transcodes on the server.
          </p>
        </section>

        {/* Playback Transition */}
        <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-4">Playback Transition</h2>
          <div className="space-y-2">
            {CROSSFADE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCrossfadeMode(opt.value)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all text-left ${
                  crossfadeMode === opt.value
                    ? 'bg-neon-cyan/[0.08] ring-1 ring-neon-cyan/30'
                    : 'hover:bg-white/5'
                }`}
              >
                <div>
                  <span className={`text-sm font-semibold ${crossfadeMode === opt.value ? 'text-neon-cyan' : 'text-text-primary'}`}>
                    {opt.label}
                  </span>
                  <p className="text-xs text-text-muted mt-0.5">{opt.desc}</p>
                </div>
                {crossfadeMode === opt.value && (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-neon-cyan shrink-0" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          {crossfadeMode === 'crossfade' && (
            <div className="mt-4 px-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-secondary">Crossfade duration</span>
                <span className="text-xs text-neon-cyan font-mono">{crossfadeDuration}s</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                step={1}
                value={crossfadeDuration}
                onChange={(e) => setCrossfadeDuration(Number(e.target.value))}
                className="w-full accent-neon-cyan"
              />
            </div>
          )}
        </section>

        {/* Playback Speed */}
        <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-4">Playback Speed</h2>
          <div className="grid grid-cols-3 gap-2">
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPlaybackSpeed(opt.value)}
                className={`flex items-center justify-center px-4 py-3 rounded-lg transition-all text-sm font-semibold ${
                  playbackSpeed === opt.value
                    ? 'bg-neon-cyan/[0.08] ring-1 ring-neon-cyan/30 text-neon-cyan'
                    : 'hover:bg-white/5 text-text-primary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted/60 mt-3 px-1">
            Adjust playback speed. Useful for learning music or speeding through spoken content.
          </p>
        </section>

        {/* Scrobbling */}
        <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted">Scrobbling</h2>
            <button
              onClick={toggleScrobbling}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                scrobbleSettings.enabled ? 'bg-neon-cyan' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  scrobbleSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Last.fm Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Last.fm</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-muted mb-2">API Key</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={lastfmApiKey}
                    onChange={(e) => setLastfmApiKey(e.target.value)}
                    placeholder="Enter your Last.fm API key"
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:border-neon-cyan/50 focus:outline-none"
                  />
                  <button
                    onClick={handleLastfmApiKeySubmit}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
              
              {scrobbleSettings.lastfm.apiKey && (
                <div>
                  <button
                    onClick={handleLastfmConnect}
                    disabled={isConnectingLastfm}
                    className="w-full px-4 py-2 bg-gradient-primary hover:shadow-[0_0_20px_rgba(0,255,221,0.15)] rounded-lg text-sm font-medium text-deep-black transition-shadow disabled:opacity-50"
                  >
                    {isConnectingLastfm ? 'Connecting...' : scrobbleSettings.lastfm.sessionKey ? `Connected as ${scrobbleSettings.lastfm.username}` : 'Connect to Last.fm'}
                  </button>
                  {lastfmStatus && (
                    <p className="text-xs text-text-muted mt-2">{lastfmStatus}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ListenBrainz Section */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">ListenBrainz</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-muted mb-2">User Token</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={listenbrainzToken}
                    onChange={(e) => setListenbrainzToken(e.target.value)}
                    placeholder="Enter your ListenBrainz token"
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:border-neon-cyan/50 focus:outline-none"
                  />
                  <button
                    onClick={handleListenbrainzTokenSubmit}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                  >
                    Connect
                  </button>
                </div>
                {listenbrainzStatus && (
                  <p className="text-xs text-text-muted mt-2">{listenbrainzStatus}</p>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-text-muted/60 mt-4 px-1">
            Scrobbling tracks your listening habits to Last.fm and/or ListenBrainz. Tracks are scrobbled after 30 seconds or 50% played (whichever comes first).
          </p>
        </section>

        {/* Offline Cache */}
        <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-4">Offline Cache</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center min-h-[44px]">
              <span className="text-text-secondary text-sm">Cache Size</span>
              <span className="text-sm font-mono text-neon-cyan">{formatCacheSize(cacheSize)}</span>
            </div>
            <button
              onClick={handleClearCache}
              disabled={clearingCache || cacheSize === 0}
              className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clearingCache ? 'Clearing...' : 'Clear Cache'}
            </button>
          </div>
          <p className="text-xs text-text-muted/60 mt-3 px-1">
            Albums downloaded for offline playback are cached locally. Use "Available Offline" on album pages to download tracks.
          </p>
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
            className="w-full py-3.5 rounded-[11px] font-semibold text-sm transition-colors min-h-[48px]"
            style={{ backgroundColor: '#050508', color: '#f0f0f5' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
