import { useState } from 'react'

interface SectionHeaderProps {
  title: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function SectionHeader({ title, count, defaultOpen = true, children }: SectionHeaderProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mb-10">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 mb-4 group"
      >
        <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 text-text-muted group-hover:text-text-secondary transition-all ${open ? 'rotate-90' : ''}`} fill="currentColor">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
        </svg>
        <span className="text-[13px] font-bold text-text-secondary group-hover:text-text-primary tracking-tight transition-colors">
          {title}
        </span>
        {count != null && (
          <span className="text-[11px] font-mono text-text-muted/60">{count.toLocaleString()}</span>
        )}
      </button>
      {open && children}
    </div>
  )
}