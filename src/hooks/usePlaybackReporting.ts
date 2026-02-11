import { useEffect, useRef } from 'react'
import { getPlaystateApi } from '@jellyfin/sdk/lib/utils/api/playstate-api'
import type { Api } from '@jellyfin/sdk'

interface UsePlaybackReportingOptions {
  api: Api | undefined
  trackId: string | undefined
  isPlaying: boolean
  currentTime: number // seconds
  muted: boolean
  volume: number
  isExternalStream?: boolean // skip reporting for non-Jellyfin tracks
}

/**
 * Reports playback state to Jellyfin server so it tracks play history,
 * play counts, and "last played" timestamps.
 */
export function usePlaybackReporting(options: UsePlaybackReportingOptions) {
  const { api, trackId, isPlaying, currentTime, muted, volume, isExternalStream } = options
  const reportedStartRef = useRef<string | null>(null)
  const progressIntervalRef = useRef<number | null>(null)
  const lastReportedTimeRef = useRef(0)

  // Report playback start when track changes
  useEffect(() => {
    if (!api || !trackId || isExternalStream) return

    // Report start
    const playstateApi = getPlaystateApi(api)
    playstateApi.onPlaybackStart({ itemId: trackId, canSeek: true }).catch((e) => {
      console.warn('[JellyAmp] Failed to report playback start:', e)
    })
    reportedStartRef.current = trackId

    return () => {
      // Report stopped when track changes or unmounts
      if (reportedStartRef.current) {
        const ticks = Math.round(lastReportedTimeRef.current * 10_000_000)
        playstateApi.onPlaybackStopped({
          itemId: reportedStartRef.current,
          positionTicks: ticks,
        }).catch(() => {})
        reportedStartRef.current = null
      }
    }
  }, [api, trackId, isExternalStream])

  // Report progress every 10 seconds while playing
  useEffect(() => {
    if (!api || !trackId || !isPlaying || isExternalStream) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      return
    }

    const playstateApi = getPlaystateApi(api)

    const reportProgress = () => {
      const ticks = Math.round(lastReportedTimeRef.current * 10_000_000)
      playstateApi.onPlaybackProgress({
        itemId: trackId,
        positionTicks: ticks,
        isPaused: false,
        isMuted: muted,
        volumeLevel: Math.round(volume * 100),
      }).catch(() => {})
    }

    // Report immediately on play
    reportProgress()

    // Then every 10 seconds
    progressIntervalRef.current = window.setInterval(reportProgress, 10_000)

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
  // Only restart interval when play state or track changes, not on every currentTime tick
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, trackId, isPlaying])

  // Update lastReportedTime on every currentTime change (for accurate stop reporting)
  useEffect(() => {
    lastReportedTimeRef.current = currentTime
  }, [currentTime])
}
