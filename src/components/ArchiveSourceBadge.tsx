export default function ArchiveSourceBadge({ source }: { source: string }) {
  const lower = source.toLowerCase()
  let label: string
  let className: string

  if (lower.includes('sbd')) {
    label = 'SBD'
    className = 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20'
  } else if (lower.includes('matrix') || lower.includes('mtx')) {
    label = 'MTX'
    className = 'bg-sky-500/15 text-sky-400 ring-sky-500/20'
  } else {
    label = 'AUD'
    className = 'bg-amber-500/15 text-amber-400 ring-amber-500/20'
  }

  return (
    <span className={`inline-flex items-center px-2 py-[3px] rounded-md text-[10px] font-mono font-bold tracking-wider ring-1 ${className}`}>
      {label}
    </span>
  )
}
