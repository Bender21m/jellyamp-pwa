import { useState } from 'react'
import { useUIStore } from '../../stores/ui'
import { validateListenBrainzToken, startLastFmAuth } from '../../lib/scrobble'

export default function ScrobbleSettings() {
  const { scrobbleSettings, updateScrobbleSettings } = useUIStore()
  
  const [lastfmApiKey, setLastfmApiKey] = useState(scrobbleSettings.lastfm.apiKey)
  const [lastfmApiSecret, setLastfmApiSecret] = useState(scrobbleSettings.lastfm.apiSecret)
  const [listenbrainzToken, setListenbrainzToken] = useState(scrobbleSettings.listenbrainz.token)
  const [isConnectingLastfm, setIsConnectingLastfm] = useState(false)
  const [lastfmStatus, setLastfmStatus] = useState('')
  const [listenbrainzStatus, setListenbrainzStatus] = useState('')

  // Handle Last.fm API key and authentication
  const handleLastfmApiKeySubmit = () => {
    if (!lastfmApiKey.trim()) return
    updateScrobbleSettings({
      lastfm: { ...scrobbleSettings.lastfm, apiKey: lastfmApiKey.trim() }
    })
    setLastfmStatus('API key saved')
  }

  const handleLastfmApiSecretSubmit = () => {
    if (!lastfmApiSecret.trim()) return
    updateScrobbleSettings({
      lastfm: { ...scrobbleSettings.lastfm, apiSecret: lastfmApiSecret.trim() }
    })
    setLastfmStatus('API secret saved')
  }

  const handleLastfmConnect = async () => {
    if (!scrobbleSettings.lastfm.apiKey) {
      setLastfmStatus('Please enter API key first')
      return
    }
    if (!scrobbleSettings.lastfm.apiSecret) {
      setLastfmStatus('Please enter API secret first')
      return
    }
    
    setIsConnectingLastfm(true)
    try {
      const authUrl = await startLastFmAuth(scrobbleSettings.lastfm.apiKey)
      window.open(authUrl, '_blank')
      setLastfmStatus('Complete authorization in the popup window')
    } catch {
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
    } catch {
      setListenbrainzStatus('Error: Invalid token')
    }
  }

  // Toggle scrobbling
  const toggleScrobbling = () => {
    updateScrobbleSettings({ enabled: !scrobbleSettings.enabled })
  }

  return (
    <section className="bg-card rounded-xl p-5 ring-1 ring-white/5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted">Scrobbling</h2>
        <button
          onClick={toggleScrobbling}
          aria-label={`Scrobbling: ${scrobbleSettings.enabled ? 'enabled' : 'disabled'}`}
          role="switch"
          aria-checked={scrobbleSettings.enabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors min-h-[44px] min-w-[44px] justify-center focus-visible:ring-2 focus-visible:ring-neon-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
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
          
          <div>
            <label className="block text-xs text-text-muted mb-2">API Secret</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={lastfmApiSecret}
                onChange={(e) => setLastfmApiSecret(e.target.value)}
                placeholder="Enter your Last.fm API secret"
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:border-neon-cyan/50 focus:outline-none"
              />
              <button
                onClick={handleLastfmApiSecretSubmit}
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
  )
}