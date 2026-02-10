// Drag and drop helpers for playlist management
// Data format: JSON string with { type, trackIds?, albumId?, albumName? }

export interface DragData {
  type: 'tracks' | 'album' | 'artist'
  trackIds?: string[]
  albumId?: string
  artistId?: string
  label?: string // display name for feedback
}

export const DRAG_FORMAT = 'application/x-jellyamp'

export function setDragData(e: React.DragEvent, data: DragData) {
  e.dataTransfer.setData(DRAG_FORMAT, JSON.stringify(data))
  e.dataTransfer.effectAllowed = 'copy'
}

export function getDragData(e: React.DragEvent): DragData | null {
  try {
    const raw = e.dataTransfer.getData(DRAG_FORMAT)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function hasDragData(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes(DRAG_FORMAT)
}
