export default function ArchiveSourceBadge({ source }: { source: string }) {
  const lower = source.toLowerCase()
  let label: string
  let className: string

  if (lower.includes('sbd')) {
    label = 'SBD'
    className = 'bg-green-500/20 text-green-400'
  } else if (lower.includes('matrix') || lower.includes('mtx')) {
    label = 'MTX'
    className = 'bg-blue-500/20 text-blue-400'
  } else {
    label = 'AUD'
    className = 'bg-amber-500/20 text-amber-400'
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium ${className}`}>
      {label}
    </span>
  )
}
