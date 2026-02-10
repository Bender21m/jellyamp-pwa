/**
 * Web Audio API Equalizer
 * 5-band EQ with standard frequency bands and presets
 */

export interface EQBand {
  frequency: number
  gain: number // -12dB to +12dB
  Q: number
  label: string
}

export interface EQPreset {
  name: string
  gains: number[] // Array of 5 gain values (-12 to +12)
}

// Standard 5-band EQ frequencies
export const EQ_BANDS: Omit<EQBand, 'gain'>[] = [
  { frequency: 60, Q: 1.0, label: '60' },      // Sub bass
  { frequency: 230, Q: 1.0, label: '230' },    // Bass
  { frequency: 910, Q: 1.0, label: '910' },    // Mid
  { frequency: 3600, Q: 1.0, label: '3.6k' },  // Presence
  { frequency: 14000, Q: 1.0, label: '14k' },  // Brilliance
]

// EQ Presets
export const EQ_PRESETS: EQPreset[] = [
  { name: 'Flat', gains: [0, 0, 0, 0, 0] },
  { name: 'Bass Boost', gains: [6, 4, 0, 0, 0] },
  { name: 'Treble Boost', gains: [0, 0, 0, 4, 6] },
  { name: 'Vocal', gains: [-2, -1, 3, 3, 1] },
  { name: 'Live Music', gains: [2, 1, 0, 2, 3] },
  { name: 'Rock', gains: [4, 2, -1, 2, 4] },
]

export class AudioEqualizer {
  private audioContext: AudioContext | null = null
  private sourceNode: MediaElementAudioSourceNode | null = null
  private filters: BiquadFilterNode[] = []
  private audioElement: HTMLAudioElement | null = null
  private isConnected = false

  /**
   * Initialize the equalizer and connect it to an audio element
   * IMPORTANT: createMediaElementSource can only be called ONCE per audio element
   */
  async connectToAudio(audioElement: HTMLAudioElement): Promise<void> {
    if (this.audioElement === audioElement && this.isConnected) {
      // Already connected to this audio element
      return
    }

    // Disconnect from previous audio if any
    this.disconnect()

    try {
      // Create AudioContext if needed
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      // Resume context if suspended (required by browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      // Create source node (can only be called once per audio element)
      this.sourceNode = this.audioContext.createMediaElementSource(audioElement)
      this.audioElement = audioElement

      // Create filter chain
      this.createFilterChain()

      // Connect the audio chain
      this.connectAudioChain()

      this.isConnected = true
    } catch (error) {
      console.error('Failed to connect equalizer to audio:', error)
      throw error
    }
  }

  /**
   * Create the chain of biquad filters for EQ bands
   */
  private createFilterChain(): void {
    if (!this.audioContext) throw new Error('AudioContext not initialized')

    // Clear existing filters
    this.filters.forEach(filter => filter.disconnect())
    this.filters = []

    // Create a filter for each EQ band
    EQ_BANDS.forEach(band => {
      const filter = this.audioContext!.createBiquadFilter()
      filter.type = 'peaking'
      filter.frequency.value = band.frequency
      filter.Q.value = band.Q
      filter.gain.value = 0 // Start flat
      this.filters.push(filter)
    })
  }

  /**
   * Connect the audio source through the filter chain to the output
   */
  private connectAudioChain(): void {
    if (!this.audioContext || !this.sourceNode || this.filters.length === 0) {
      throw new Error('Audio chain components not ready')
    }

    // Connect source -> first filter -> ... -> last filter -> destination
    this.sourceNode.connect(this.filters[0])

    for (let i = 0; i < this.filters.length - 1; i++) {
      this.filters[i].connect(this.filters[i + 1])
    }

    this.filters[this.filters.length - 1].connect(this.audioContext.destination)
  }

  /**
   * Set gain for a specific EQ band
   */
  setBandGain(bandIndex: number, gain: number): void {
    if (bandIndex < 0 || bandIndex >= this.filters.length) {
      throw new Error(`Invalid band index: ${bandIndex}`)
    }

    if (gain < -12 || gain > 12) {
      throw new Error(`Gain must be between -12 and +12 dB, got: ${gain}`)
    }

    this.filters[bandIndex].gain.value = gain
  }

  /**
   * Get current gain for a specific EQ band
   */
  getBandGain(bandIndex: number): number {
    if (bandIndex < 0 || bandIndex >= this.filters.length) {
      throw new Error(`Invalid band index: ${bandIndex}`)
    }
    return this.filters[bandIndex]?.gain.value ?? 0
  }

  /**
   * Set all EQ bands to specific gains
   */
  setEQGains(gains: number[]): void {
    if (gains.length !== EQ_BANDS.length) {
      throw new Error(`Expected ${EQ_BANDS.length} gain values, got ${gains.length}`)
    }

    gains.forEach((gain, index) => {
      this.setBandGain(index, gain)
    })
  }

  /**
   * Get all current EQ band gains
   */
  getEQGains(): number[] {
    return this.filters.map(filter => filter.gain.value)
  }

  /**
   * Apply an EQ preset
   */
  applyPreset(preset: EQPreset): void {
    this.setEQGains(preset.gains)
  }

  /**
   * Reset all EQ bands to flat (0dB)
   */
  reset(): void {
    this.filters.forEach(filter => {
      filter.gain.value = 0
    })
  }

  /**
   * Disconnect the equalizer and clean up resources
   */
  disconnect(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    this.filters.forEach(filter => filter.disconnect())
    this.filters = []

    this.audioElement = null
    this.isConnected = false
  }

  /**
   * Check if equalizer is connected and ready
   */
  get connected(): boolean {
    return this.isConnected && this.filters.length > 0
  }

  /**
   * Get the current audio context
   */
  get context(): AudioContext | null {
    return this.audioContext
  }
}