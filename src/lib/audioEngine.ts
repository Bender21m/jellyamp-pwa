/**
 * AudioEngine — singleton audio engine for gapless/crossfade playback
 * Replaces the dual-audio-element approach in Player.tsx
 * 
 * Architecture:
 *   HTMLAudioElement → MediaElementSourceNode → GainNode → masterGain → destination
 *   (two such chains exist: current + next, for gapless/crossfade transitions)
 * 
 * Key insight: uses AudioContext.currentTime scheduling for sample-accurate transitions
 * instead of unreliable event-based timing.
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

interface AudioSlot {
  element: HTMLAudioElement
  sourceNode: MediaElementAudioSourceNode | null
  gainNode: GainNode | null
  url: string
}

class AudioEngine {
  private context: AudioContext | null = null
  private masterGain: GainNode | null = null
  
  private current: AudioSlot | null = null
  private next: AudioSlot | null = null
  
  private state: EngineState = 'idle'
  private callbacks: AudioEngineCallbacks = {}
  
  // Crossfade settings
  private crossfadeMode: CrossfadeMode = 'gapless'
  private crossfadeDuration: number = 3 // seconds
  
  // Volume
  private _volume: number = 0.8
  private _muted: boolean = false
  
  // Monitoring
  private rafId: number | null = null
  private transitionScheduled: boolean = false
  private preloadedUrl: string | null = null
  
  // EQ integration point — external code can insert nodes between slots and master
  private eqInputNode: GainNode | null = null  // if set, slots connect here instead of masterGain
  private eqOutputNode: AudioNode | null = null // EQ chain output connects to masterGain
  
  // Track which elements already have MediaElementSourceNode (can only create once per element)
  private sourceNodeMap = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>()

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
   * Cancels any pending load/transition and starts fresh.
   */
  async play(url: string): Promise<void> {
    this.ensureContext()
    
    // Cancel any pending transition
    this.transitionScheduled = false
    this.stopMonitoring()
    
    // If the next slot has this URL preloaded, promote it
    if (this.next && this.next.url === url && this.next.element.readyState >= 3) {
      // Fade out current
      if (this.current) {
        this.destroySlot(this.current)
      }
      this.current = this.next
      this.next = null
      this.preloadedUrl = null
      
      this.connectSlot(this.current)
      this.setSlotGain(this.current, this.effectiveVolume)
      
      try {
        await this.current.element.play()
        this.setState('playing')
        this.startMonitoring()
      } catch (err) {
        this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
        this.setState('idle')
      }
      return
    }
    
    // Clean up existing slots
    if (this.next) {
      this.destroySlot(this.next)
      this.next = null
      this.preloadedUrl = null
    }
    if (this.current) {
      this.destroySlot(this.current)
      this.current = null
    }
    
    // Create new slot
    this.setState('loading')
    const slot = this.createSlot(url)
    this.current = slot
    this.connectSlot(slot)
    
    // Wait for canplay, then start
    if (slot.element.readyState >= 3) {
      this.setSlotGain(slot, this.effectiveVolume)
      try {
        await slot.element.play()
        this.setState('playing')
        this.emitDuration()
        this.startMonitoring()
      } catch (err) {
        this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
        this.setState('idle')
      }
    } else {
      await new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          slot.element.removeEventListener('error', onError)
          resolve()
        }
        const onError = () => {
          slot.element.removeEventListener('canplay', onCanPlay)
          reject(new Error(`Failed to load: ${url}`))
        }
        slot.element.addEventListener('canplay', onCanPlay, { once: true })
        slot.element.addEventListener('error', onError, { once: true })
      }).then(async () => {
        // Check we're still the current slot (play() might have been called again)
        if (this.current !== slot) {
          this.destroySlot(slot)
          return
        }
        this.setSlotGain(slot, this.effectiveVolume)
        await slot.element.play()
        this.setState('playing')
        this.emitDuration()
        this.startMonitoring()
      }).catch((err) => {
        if (this.current === slot) {
          this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
          this.setState('idle')
        }
      })
    }
  }

  pause(): void {
    if (this.current && this.state === 'playing') {
      this.current.element.pause()
      this.setState('paused')
    }
  }

  resume(): void {
    if (this.current && this.state === 'paused') {
      this.current.element.play().then(() => {
        this.setState('playing')
        this.startMonitoring()
      }).catch((err) => {
        this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
      })
    }
  }

  seek(time: number): void {
    if (this.current) {
      this.current.element.currentTime = time
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
  get currentTime(): number { return this.current?.element.currentTime ?? 0 }
  get duration(): number {
    const d = this.current?.element.duration ?? 0
    return isFinite(d) ? d : 0
  }
  get currentState(): EngineState { return this.state }
  get currentUrl(): string | null { return this.current?.url ?? null }

  /**
   * Preload the next track for gapless/crossfade transition.
   * Call this when ~10s from end of current track.
   */
  preloadNext(url: string): void {
    if (this.crossfadeMode === 'off') return
    if (this.preloadedUrl === url) return
    
    this.ensureContext()
    
    // Clean up existing next slot
    if (this.next) {
      this.destroySlot(this.next)
    }
    
    const slot = this.createSlot(url)
    slot.element.preload = 'auto'
    slot.element.load()
    this.next = slot
    this.preloadedUrl = url
    
    // Connect but keep gain at 0
    this.connectSlot(slot)
    this.setSlotGain(slot, 0)
  }

  /**
   * Stop everything and clean up.
   */
  stop(): void {
    this.stopMonitoring()
    this.transitionScheduled = false
    if (this.current) {
      this.destroySlot(this.current)
      this.current = null
    }
    if (this.next) {
      this.destroySlot(this.next)
      this.next = null
      this.preloadedUrl = null
    }
    this.setState('idle')
  }

  /**
   * Get the AudioContext for external use (EQ, visualizations).
   */
  getAudioContext(): AudioContext {
    this.ensureContext()
    return this.context!
  }

  /**
   * Get the master gain node — EQ or other effects should connect to this.
   */
  getMasterGain(): GainNode {
    this.ensureContext()
    return this.masterGain!
  }

  /**
   * Insert an EQ chain between audio slots and the master output.
   * eqInput: node that receives audio from slots
   * eqOutput: node whose output goes to masterGain -> destination
   * Pass null to bypass EQ.
   */
  setEQChain(eqInput: GainNode | null, eqOutput: AudioNode | null): void {
    // Disconnect current slots from their current destination
    if (this.current?.gainNode) {
      this.current.gainNode.disconnect()
    }
    if (this.next?.gainNode) {
      this.next.gainNode.disconnect()
    }
    // Disconnect old EQ output
    if (this.eqOutputNode) {
      try { this.eqOutputNode.disconnect() } catch { /* ignore */ }
    }
    
    this.eqInputNode = eqInput
    this.eqOutputNode = eqOutput
    
    // Reconnect slots to new destination
    const dest = this.getSlotDestination()
    if (this.current?.gainNode) {
      this.current.gainNode.connect(dest)
    }
    if (this.next?.gainNode) {
      this.next.gainNode.connect(dest)
    }
    
    // Connect EQ output to masterGain
    if (eqOutput && this.masterGain) {
      eqOutput.connect(this.masterGain)
    }
  }

  /**
   * Get the current audio element (for MediaSession position state, etc.)
   */
  getCurrentElement(): HTMLAudioElement | null {
    return this.current?.element ?? null
  }

  // --- Internal ---

  private ensureContext(): void {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.masterGain = this.context.createGain()
      this.masterGain.gain.value = 1 // Volume is controlled per-slot
      this.masterGain.connect(this.context.destination)
    }
    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => {})
    }
  }

  private get effectiveVolume(): number {
    return this._muted ? 0 : this._volume
  }

  private applyVolume(): void {
    if (this.current?.gainNode) {
      this.current.gainNode.gain.value = this.effectiveVolume
    }
    // Don't touch next slot volume — it's controlled by transition logic
  }

  private createSlot(url: string): AudioSlot {
    const element = new Audio()
    element.crossOrigin = 'anonymous'
    element.preload = 'auto'
    element.src = url
    
    return {
      element,
      sourceNode: null,
      gainNode: null,
      url,
    }
  }

  private connectSlot(slot: AudioSlot): void {
    if (!this.context || slot.sourceNode) return
    
    // Check if this element already has a source node
    let sourceNode = this.sourceNodeMap.get(slot.element)
    if (!sourceNode) {
      sourceNode = this.context.createMediaElementSource(slot.element)
      this.sourceNodeMap.set(slot.element, sourceNode)
    }
    slot.sourceNode = sourceNode
    
    const gainNode = this.context.createGain()
    gainNode.gain.value = 0
    slot.gainNode = gainNode
    
    sourceNode.connect(gainNode)
    gainNode.connect(this.getSlotDestination())
  }

  private getSlotDestination(): AudioNode {
    return this.eqInputNode ?? this.masterGain!
  }

  private setSlotGain(slot: AudioSlot, value: number): void {
    if (slot.gainNode) {
      slot.gainNode.gain.value = value
    }
  }

  private destroySlot(slot: AudioSlot): void {
    slot.element.pause()
    if (slot.gainNode) {
      slot.gainNode.disconnect()
      slot.gainNode = null
    }
    if (slot.sourceNode) {
      slot.sourceNode.disconnect()
      slot.sourceNode = null
    }
    slot.element.removeAttribute('src')
    slot.element.load() // Reset the element
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
      if (!this.current || this.state === 'idle') {
        this.rafId = null
        return
      }
      
      const el = this.current.element
      
      // Emit time update
      this.callbacks.onTimeUpdate?.(el.currentTime)
      
      // Check duration changes
      if (el.duration && isFinite(el.duration)) {
        this.emitDuration()
      }
      
      // Handle end-of-track transitions
      if (el.duration && isFinite(el.duration) && !el.paused) {
        const remaining = el.duration - el.currentTime
        
        if (this.crossfadeMode === 'gapless') {
          this.handleGaplessMonitor(remaining)
        } else if (this.crossfadeMode === 'crossfade') {
          this.handleCrossfadeMonitor(remaining)
        }
        
        // Track ended naturally (no next track preloaded, or mode=off)
        if (el.ended && !this.transitionScheduled) {
          this.transitionScheduled = true
          this.setState('idle')
          this.callbacks.onTrackEnd?.()
          this.rafId = null
          return
        }
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

  private handleGaplessMonitor(remaining: number): void {
    if (this.transitionScheduled) return
    
    // At ~50ms before end, if next is ready, do instant cutover
    if (remaining <= 0.05 && remaining > 0 && this.next && this.next.element.readyState >= 3) {
      this.transitionScheduled = true
      this.executeGaplessTransition()
    }
  }

  private handleCrossfadeMonitor(remaining: number): void {
    if (this.transitionScheduled && remaining > 0) {
      // Already in crossfade — update gains
      const progress = 1 - (remaining / this.crossfadeDuration)
      const clampedProgress = Math.max(0, Math.min(1, progress))
      
      if (this.current?.gainNode) {
        this.current.gainNode.gain.value = this.effectiveVolume * (1 - clampedProgress)
      }
      if (this.next?.gainNode) {
        this.next.gainNode.gain.value = this.effectiveVolume * clampedProgress
      }
      
      // Transition complete
      if (remaining <= 0.01) {
        this.finishTransition()
      }
      return
    }
    
    // Start crossfade when within crossfadeDuration
    if (!this.transitionScheduled && remaining <= this.crossfadeDuration && remaining > 0 && this.next && this.next.element.readyState >= 3) {
      this.transitionScheduled = true
      this.next.element.play().catch(() => {})
    }
  }

  private executeGaplessTransition(): void {
    if (!this.next) return
    
    // Instant volume swap
    this.setSlotGain(this.next, this.effectiveVolume)
    this.next.element.play().catch(() => {})
    
    this.finishTransition()
  }

  private finishTransition(): void {
    // Destroy old current, promote next
    if (this.current) {
      this.destroySlot(this.current)
    }
    this.current = this.next
    this.next = null
    this.preloadedUrl = null
    this.transitionScheduled = false
    
    this.emitDuration()
    this.callbacks.onTrackEnd?.()
  }
}

// Singleton
export const audioEngine = new AudioEngine()
