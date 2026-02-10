/**
 * AudioEngine — singleton audio engine for gapless/crossfade playback
 * 
 * Design principles:
 * - Event-driven (timeupdate, ended) as PRIMARY — works in background/screen off
 * - RAF as ENHANCEMENT ONLY for tighter gapless timing when tab is visible
 * - Reuses persistent audio elements (helps iOS PWA background playback)
 * - No Web Audio API (avoids CORS issues with Jellyfin)
 */

export type EngineState = 'idle' | 'loading' | 'playing' | 'paused'
export type CrossfadeMode = 'off' | 'gapless' | 'crossfade'

export interface AudioEngineCallbacks {
  onTimeUpdate?: (time: number) => void
  onDurationChange?: (duration: number) => void
  onTrackEnd?: () => void
  onStateChange?: (state: EngineState) => void
  onError?: (err: Error) => void
}

class AudioEngine {
  // Two persistent audio elements — reused across tracks
  private audioA: HTMLAudioElement
  private audioB: HTMLAudioElement
  private currentAudio: HTMLAudioElement | null = null
  private nextAudio: HTMLAudioElement | null = null
  
  private currentUrl: string | null = null
  private nextUrl: string | null = null
  
  private state: EngineState = 'idle'
  private callbacks: AudioEngineCallbacks = {}
  
  private crossfadeMode: CrossfadeMode = 'gapless'
  private crossfadeDuration: number = 3
  
  private _volume: number = 0.8
  private _muted: boolean = false
  
  // RAF for enhanced gapless (only when tab visible)
  private rafId: number | null = null
  private gaplessTriggered: boolean = false
  
  // Track if we're in a transition to prevent double-advance
  // @ts-ignore — used for debugging/future guard
  private _advancing: boolean = false

  constructor() {
    // Create two persistent audio elements
    this.audioA = new Audio()
    this.audioB = new Audio()
    this.audioA.preload = 'auto'
    this.audioB.preload = 'auto'
  }

  /**
   * Attach the audio elements to the DOM (call once from React).
   * Helps iOS PWA keep audio alive in background.
   */
  attachToDOM(container: HTMLElement): void {
    this.audioA.style.display = 'none'
    this.audioB.style.display = 'none'
    container.appendChild(this.audioA)
    container.appendChild(this.audioB)
  }

  // --- Public API ---

  setCallbacks(cb: AudioEngineCallbacks) {
    this.callbacks = cb
  }

  setCrossfadeMode(mode: CrossfadeMode) {
    this.crossfadeMode = mode
  }

  setCrossfadeDuration(seconds: number) {
    this.crossfadeDuration = Math.max(1, Math.min(12, seconds))
  }

  async play(url: string): Promise<void> {
    // Already playing this URL — no-op (happens after gapless transition)
    if (this.currentAudio && this.currentUrl === url && !this.currentAudio.paused && !this.currentAudio.ended) {
      this.setState('playing')
      return
    }

    this.stopRAF()
    this.gaplessTriggered = false
    this._advancing = false
    
    // Pick which audio element to use
    // If next has this URL preloaded, promote it
    if (this.nextAudio && this.nextUrl === url && this.nextAudio.readyState >= 3) {
      const oldCurrent = this.currentAudio
      this.cleanupAudio(oldCurrent)
      
      this.currentAudio = this.nextAudio
      this.currentUrl = url
      this.nextAudio = null
      this.nextUrl = null
      
      this.bindCurrentEvents()
      this.currentAudio.volume = this.effectiveVolume
      
      try {
        await this.currentAudio.play()
        this.setState('playing')
        this.emitDuration()
        this.startRAF()
      } catch (err) {
        this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
        this.setState('idle')
      }
      return
    }

    // Clean up both
    this.cleanupAudio(this.currentAudio)
    this.cleanupAudio(this.nextAudio)
    this.nextAudio = null
    this.nextUrl = null
    
    // Use whichever element isn't the current one (or audioA if both free)
    const audio = this.currentAudio === this.audioA ? this.audioB : this.audioA
    
    this.setState('loading')
    audio.src = url
    audio.volume = this.effectiveVolume
    audio.load()
    this.currentAudio = audio
    this.currentUrl = url
    
    this.bindCurrentEvents()
    
    try {
      await this.waitForCanPlay(audio)
      // Verify still current (play() might have been called again)
      if (this.currentAudio !== audio) return
      
      await audio.play()
      this.setState('playing')
      this.emitDuration()
      this.startRAF()
    } catch (err) {
      if (this.currentAudio === audio) {
        this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
        this.setState('idle')
      }
    }
  }

  pause(): void {
    if (this.currentAudio && this.state === 'playing') {
      this.currentAudio.pause()
      this.setState('paused')
      this.stopRAF()
    }
  }

  resume(): void {
    if (this.currentAudio && this.state === 'paused') {
      this.currentAudio.play().then(() => {
        this.setState('playing')
        this.startRAF()
      }).catch((err) => {
        this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
      })
    }
  }

  seek(time: number): void {
    if (this.currentAudio && isFinite(time)) {
      this.currentAudio.currentTime = time
    }
  }

  setVolume(vol: number): void {
    this._volume = Math.max(0, Math.min(1, vol))
    this.applyVolume()
  }

  setMuted(muted: boolean): void {
    this._muted = muted
    this.applyVolume()
  }

  get volume(): number { return this._volume }
  get muted(): boolean { return this._muted }
  get currentTime(): number { return this.currentAudio?.currentTime ?? 0 }
  get duration(): number {
    const d = this.currentAudio?.duration ?? 0
    return isFinite(d) ? d : 0
  }
  get currentState(): EngineState { return this.state }
  get playingUrl(): string | null { return this.currentUrl }

  preloadNext(url: string): void {
    if (this.crossfadeMode === 'off') return
    if (this.nextUrl === url) return
    
    // Use the OTHER audio element
    const audio = this.currentAudio === this.audioA ? this.audioB : this.audioA
    
    // Don't preload into the currently playing element
    if (audio === this.currentAudio) return
    
    this.cleanupAudio(this.nextAudio)
    
    audio.src = url
    audio.volume = 0
    audio.preload = 'auto'
    audio.load()
    this.nextAudio = audio
    this.nextUrl = url
  }

  stop(): void {
    this.stopRAF()
    this.gaplessTriggered = false
    this._advancing = false
    this.cleanupAudio(this.currentAudio)
    this.cleanupAudio(this.nextAudio)
    this.currentAudio = null
    this.currentUrl = null
    this.nextAudio = null
    this.nextUrl = null
    this.setState('idle')
  }

  getCurrentElement(): HTMLAudioElement | null {
    return this.currentAudio
  }

  // --- Internal ---

  private get effectiveVolume(): number {
    return this._muted ? 0 : this._volume
  }

  private applyVolume(): void {
    if (this.currentAudio) {
      this.currentAudio.volume = this.effectiveVolume
    }
  }

  private waitForCanPlay(audio: HTMLAudioElement): Promise<void> {
    if (audio.readyState >= 3) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const onCanPlay = () => {
        audio.removeEventListener('error', onError)
        resolve()
      }
      const onError = () => {
        audio.removeEventListener('canplay', onCanPlay)
        reject(new Error(`Failed to load audio`))
      }
      audio.addEventListener('canplay', onCanPlay, { once: true })
      audio.addEventListener('error', onError, { once: true })
    })
  }

  // Event handlers bound to current audio
  private boundTimeUpdate = this.onTimeUpdate.bind(this)
  private boundDurationChange = this.onDurationChange.bind(this)
  private boundEnded = this.onEnded.bind(this)
  private boundError = this.onError.bind(this)

  private bindCurrentEvents(): void {
    if (!this.currentAudio) return
    // Remove from both first to avoid duplicates
    this.audioA.removeEventListener('timeupdate', this.boundTimeUpdate)
    this.audioA.removeEventListener('durationchange', this.boundDurationChange)
    this.audioA.removeEventListener('ended', this.boundEnded)
    this.audioA.removeEventListener('error', this.boundError)
    this.audioB.removeEventListener('timeupdate', this.boundTimeUpdate)
    this.audioB.removeEventListener('durationchange', this.boundDurationChange)
    this.audioB.removeEventListener('ended', this.boundEnded)
    this.audioB.removeEventListener('error', this.boundError)
    
    // Bind to current
    this.currentAudio.addEventListener('timeupdate', this.boundTimeUpdate)
    this.currentAudio.addEventListener('durationchange', this.boundDurationChange)
    this.currentAudio.addEventListener('ended', this.boundEnded)
    this.currentAudio.addEventListener('error', this.boundError)
  }

  private onTimeUpdate(): void {
    if (!this.currentAudio) return
    const time = this.currentAudio.currentTime
    this.callbacks.onTimeUpdate?.(time)
    
    const dur = this.currentAudio.duration
    if (!dur || !isFinite(dur)) return
    
    const remaining = dur - time
    
    // Preload trigger (handled by Player.tsx via onTimeUpdate callback)
    
    // Crossfade handling (works in background via timeupdate events)
    if (this.crossfadeMode === 'crossfade' && !this.gaplessTriggered) {
      this.handleCrossfade(remaining)
    }
    
    // Gapless: timeupdate fires ~4x/sec, so use it as fallback
    // RAF provides tighter timing when tab is visible
    if (this.crossfadeMode === 'gapless' && !this.gaplessTriggered && remaining <= 0.3 && remaining > 0) {
      if (this.nextAudio && this.nextAudio.readyState >= 3) {
        this.executeGaplessTransition()
      }
    }
  }

  private onDurationChange(): void {
    this.emitDuration()
  }

  private onEnded(): void {
    // If gapless/crossfade already handled the transition, ignore
    if (this.gaplessTriggered) return
    
    // Normal track end — advance to next
    this._advancing = true
    this.stopRAF()
    this.setState('idle')
    this.callbacks.onTrackEnd?.()
    this._advancing = false
  }

  private onError(): void {
    const audio = this.currentAudio
    if (audio) {
      console.error('[AudioEngine] Error:', audio.error?.code, audio.error?.message)
      this.callbacks.onError?.(new Error(audio.error?.message ?? 'Audio error'))
    }
  }

  private cleanupAudio(audio: HTMLAudioElement | null): void {
    if (!audio) return
    audio.pause()
    audio.removeEventListener('timeupdate', this.boundTimeUpdate)
    audio.removeEventListener('durationchange', this.boundDurationChange)
    audio.removeEventListener('ended', this.boundEnded)
    audio.removeEventListener('error', this.boundError)
    audio.removeAttribute('src')
    audio.load() // Reset
  }

  private setState(state: EngineState): void {
    if (this.state !== state) {
      this.state = state
      this.callbacks.onStateChange?.(state)
    }
  }

  private emitDuration(): void {
    const d = this.duration
    if (d > 0) this.callbacks.onDurationChange?.(d)
  }

  // --- RAF for enhanced gapless (tab visible only) ---
  
  private startRAF(): void {
    if (this.rafId !== null || this.crossfadeMode !== 'gapless') return
    
    const tick = () => {
      if (!this.currentAudio || this.state !== 'playing' || this.gaplessTriggered) {
        this.rafId = null
        return
      }
      
      const dur = this.currentAudio.duration
      if (dur && isFinite(dur)) {
        const remaining = dur - this.currentAudio.currentTime
        
        // Tight gapless at 50ms
        if (remaining <= 0.05 && remaining > 0 && this.nextAudio && this.nextAudio.readyState >= 3) {
          this.executeGaplessTransition()
          return
        }
      }
      
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  private stopRAF(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  // --- Transitions ---

  private executeGaplessTransition(): void {
    if (!this.nextAudio || this.gaplessTriggered) return
    this.gaplessTriggered = true
    this.stopRAF()
    
    // Start next track
    this.nextAudio.volume = this.effectiveVolume
    this.nextAudio.play().catch(() => {})
    
    // Swap
    const oldAudio = this.currentAudio
    this.cleanupAudio(oldAudio)
    
    this.currentAudio = this.nextAudio
    this.currentUrl = this.nextUrl
    this.nextAudio = null
    this.nextUrl = null
    
    this.bindCurrentEvents()
    this.emitDuration()
    
    // Notify store to advance (will trigger play(newUrl) which will no-op)
    this._advancing = true
    this.callbacks.onTrackEnd?.()
    this._advancing = false
    this.gaplessTriggered = false
    
    // Continue monitoring new track
    this.startRAF()
  }

  private handleCrossfade(remaining: number): void {
    if (!this.nextAudio || this.nextAudio.readyState < 3) return
    if (remaining > this.crossfadeDuration || remaining <= 0) return
    
    const progress = 1 - (remaining / this.crossfadeDuration)
    
    // Start next if needed
    if (this.nextAudio.paused) {
      this.nextAudio.play().catch(() => {})
    }
    
    // Fade volumes
    if (this.currentAudio) {
      this.currentAudio.volume = this.effectiveVolume * (1 - progress)
    }
    this.nextAudio.volume = this.effectiveVolume * progress
    
    // Complete at end
    if (remaining <= 0.15) {
      this.gaplessTriggered = true
      
      const oldAudio = this.currentAudio
      this.cleanupAudio(oldAudio)
      
      this.currentAudio = this.nextAudio
      this.currentUrl = this.nextUrl
      this.currentAudio.volume = this.effectiveVolume
      this.nextAudio = null
      this.nextUrl = null
      
      this.bindCurrentEvents()
      this.emitDuration()
      
      this._advancing = true
      this.callbacks.onTrackEnd?.()
      this._advancing = false
      this.gaplessTriggered = false
    }
  }
}

// Singleton
export const audioEngine = new AudioEngine()
