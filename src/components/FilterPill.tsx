interface FilterPillProps {
  label: string
  active: boolean
  onClick: () => void
}

export default function FilterPill({ label, active, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 min-h-[36px] rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 active:scale-95 ${
        active
          ? 'bg-neon-cyan text-deep-black shadow-[0_0_12px_rgba(0,255,221,0.3)] font-semibold'
          : 'bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary border border-white/[0.08]'
      }`}
    >
      {label}
    </button>
  )
}
