export function formatRelativeTime(date: string): string {
  const now = new Date()
  const playedDate = new Date(date)
  const diff = now.getTime() - playedDate.getTime()
  
  const minute = 60 * 1000
  const hour = minute * 60
  const day = hour * 24
  const week = day * 7
  const month = day * 30
  const year = day * 365

  if (diff < minute) {
    return 'Just now'
  } else if (diff < hour) {
    const minutes = Math.floor(diff / minute)
    return `${minutes}m ago`
  } else if (diff < day) {
    const hours = Math.floor(diff / hour)
    return `${hours}h ago`
  } else if (diff < day * 2) {
    return 'Yesterday'
  } else if (diff < week) {
    const days = Math.floor(diff / day)
    return `${days} days ago`
  } else if (diff < month) {
    const weeks = Math.floor(diff / week)
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  } else if (diff < year) {
    // Format as "Jan 15", "Dec 3", etc.
    return playedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } else {
    // Format as "Jan 15, 2023"
    return playedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
}