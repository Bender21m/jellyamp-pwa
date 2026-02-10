/**
 * AudioEngine — singleton audio engine for gapless/crossfade playback
 * 
 * Uses two HTMLAudioElements with requestAnimationFrame monitoring
 * for precise gapless transitions. No Web Audio API (avoids CORS issues
 * with Jellyfin servers).
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
  
  private rafId: number | null = null
  private transitionTriggered: boolean = false

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

  /**
   * Play a URL. Always works regardless of current state.
   */
  async play(url: string): Promise<void> {
    // Already playing this URL (e.g. after gapless transition) — no-op
    if (this.currentAudio && this.currentUrl === url && !this.currentAudio.paused && !this.currentAudio.ended) {
      this.setState('playing')
      this.startMonitoring()
      return
    }
    
    this.stopMonitoring()
    this.transitionTriggered = false
    
    // If next audio has this URL preloaded and ready, promote it
    if (this.nextAudio && this.nextUrl === url && this.nextAudio.readyState >= 3) {
      this.destroyAudio(this.currentAudio)
      this.currentAudio = this.nextAudio
      this.currentUrl = this.nextUrl
      this.nextAudio = null
      this.nextUrl = null
      
      this.currentAudio.volume = this.effectiveVolume
      try {
        await this.currentAudio.play()
        this.setState('playing')
        this.emitDuration()
        this.startMonitoring()
      } catch (err) {
        this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
        this.setState('idle')
      }
      return
    }
    
    // Clean up
    this.destroyAudio(this.nextAudio)
    this.nextAudio = null
    this.nextUrl = null
    this.destroyAudio(this.currentAudio)
    
    // Create fresh audio
    this.setState('loading')
    const audio = new Audio()
    audio.preload = 'auto'
    audio.src = url
    audio.volume = this.effectiveVolume
    this.currentAudio = audio
    this.currentUrl = url
    
    // Set up ended handler as fallback (RAF should catch it first for gapless)
    audio.addEventListener('ended', this.handleEnded)
    
    if (audio.readyState >= 3) {
      try {
        await audio.play()
        this.setState('playing')
        this.emitDuration()
        this.startMonitoring()
      } catch (err) {
        this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
        this.setState('idle')
      }
    } else {
      try {
        await new Promise<void>((resolve, reject) => {
          const onCanPlay = () => {
            audio.removeEventListener('error', onError)
            resolve()
          }
          const onError = () => {
            audio.removeEventListener('canplay', onCanPlay)
            reject(new Error(`Failed to load: ${url}`))
          }
          audio.addEventListener('canplay', onCanPlay, { once: true })
          audio.addEventListener('error', onError, { once: true })
        })
        
        // Verify we're still the current audio (play() might have been called again)
        if (this.currentAudio !== audio) {
          this.destroyAudio(audio)
          return
        }
        
        await audio.play()
        this.setState('playing')
        this.emitDuration()
        this.startMonitoring()
      } catch (err) {
        if (this.currentAudio === audio) {
          this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
          this.setState('idle')
        }
      }
    }
  }

  pause(): void {
    if (this.currentAudio && this.state === 'playing') {
      this.currentAudio.pause()
      this.setState('paused')
    }
  }

  resume(): void {
    if (this.currentAudio && this.state === 'paused') {
      this.currentAudio.play().then(() => {
        this.setState('playing')
        this.startMonitoring()
      }).catch((err) => {
        this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
      })
    }
  }

  seek(time: number): void {
    if (this.currentAudio) {
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

  /**
   * Preload next track for gapless/crossfade.
   */
  preloadNext(url: string): void {
    if (this.crossfadeMode === 'off') return
    if (this.nextUrl === url) return
    
    this.destroyAudio(this.nextAudio)
    
    const audio = new Audio()
    audio.preload = 'auto'
    audio.src = url
    audio.volume = 0
    audio.load()
    this.nextAudio = audio
    this.nextUrl = url
  }

  stop(): void {
    this.stopMonitoring()
    this.transitionTriggered = false
    this.destroyAudio(this.currentAudio)
    this.currentAudio = null
    this.currentUrl = null
    this.destroyAudio(this.nextAudio)
    this.nextAudio = null
    this.nextUrl = null
    this.setState('idle')
  }

  /**
   * Get current audio element (for EQ, visualizations, etc.)
   */
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

  private handleEnded = (): void => {
    // Fallback: if RAF didn't catch the transition, handle it here
    if (!this.transitionTriggered) {
      this.transitionTriggered = true
      this.stopMonitoring()
      this.setState('idle')
      this.callbacks.onTrackEnd?.()
    }
  }

  private destroyAudio(audio: HTMLAudioElement | null): void {
    if (!audio) return
    audio.removeEventListener('ended', this.handleEnded)
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }

  private setState(state: EngineState): void {
    if (this.state !== state) {
      this.state = state
      this.callbacks.onStateChange?.(state)
    }
  }

  private emitDuration(): void {
    const d = this.duration
    if (d > 0) {
      this.callbacks.onDurationChange?.(d)
    }
  }

  private startMonitoring(): void {
    if (this.rafId !== null) return
    
    const tick = () => {
      if (!this.currentAudio || this.state === 'idle') {
        this.rafId = null
        return
      }
      
      const audio = this.currentAudio
      
      // Time update
      this.callbacks.onTimeUpdate?.(audio.currentTime)
      
      // Duration
      if (audio.duration && isFinite(audio.duration)) {
        this.emitDuration()
      }
      
      // End-of-track handling
      if (audio.duration && isFinite(audio.duration) && !audio.paused && !audio.ended) {
        const remaining = audio.duration - audio.currentTime
        
        if (this.crossfadeMode === 'gapless' && !this.transitionTriggered) {
          // At ~50ms before end, start next track for seamless transition
          if (remaining <= 0.05 && remaining > 0 && this.nextAudio && this.nextAudio.readyState >= 3) {
            this.transitionTriggered = true
            this.executeGaplessTransition()
            return
          }
        } else if (this.crossfadeMode === 'crossfade') {
          this.handleCrossfade(remaining)
        }
      }
      
      // Check if ended (RAF fallback for ended event)
      if (audio.ended && !this.transitionTriggered) {
        this.transitionTriggered = true
        this.rafId = null
        this.setState('idle')
        this.callbacks.onTrackEnd?.()
        return
      }
      
      this.rafId = requestAnimationFrame(tick)
    }
    
    this.rafId = requestAnimationFrame(tick)
  }

  private stopMonitoring(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private executeGaplessTransition(): void {
    if (!this.nextAudio) return
    
    // Start next track immediately
    this.nextAudio.volume = this.effectiveVolume
    this.nextAudio.play().catch(() => {})
    
    // Swap: destroy current, promote next
    this.destroyAudio(this.currentAudio)
    this.currentAudio = this.nextAudio
    this.currentUrl = this.nextUrl
    this.currentAudio.addEventListener('ended', this.handleEnded)
    this.nextAudio = null
    this.nextUrl = null
    this.transitionTriggered = false // Reset for next transition
    
    this.emitDuration()
    this.callbacks.onTrackEnd?.()
    
    // Continue monitoring the new current track
    // (don't stop/restart — just let the RAF loop pick up the new currentAudio)
  }

  private handleCrossfade(remaining: number): void {
    if (!this.nextAudio || this.nextAudio.readyState < 3) return
    
    if (remaining <= this.crossfadeDuration && remaining > 0) {
      const progress = 1 - (remaining / this.crossfadeDuration)
      
      // Start next if not playing yet
      if (this.nextAudio.paused) {
        this.nextAudio.play().catch(() => {})
      }
      
      // Crossfade volumes
      if (this.currentAudio) {
        this.currentAudio.volume = this.effectiveVolume * (1 - progress)
      }
      this.nextAudio.volume = this.effectiveVolume * progress
      
      // Complete transition at end
      if (remaining <= 0.05) {
        this.transitionTriggered = true
        this.destroyAudio(this.currentAudio)
        this.currentAudio = this.nextAudio
        this.currentUrl = this.nextUrl
        this.currentAudio.addEventListener('ended', this.handleEnded)
        this.currentAudio.volume = this.effectiveVolume
        this.nextAudio = null
        this.nextUrl = null
        this.transitionTriggered = false
        
        this.emitDuration()
        this.callbacks.onTrackEnd?.()
      }
    }
  }
}

// Singleton
export const audioEngine = new AudioEngine()
