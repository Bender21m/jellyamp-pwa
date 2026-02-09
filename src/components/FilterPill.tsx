import { motion } from 'framer-motion'

interface FilterPillProps {
  label: string
  active: boolean
  onClick: () => void
}

export default function FilterPill({ label, active, onClick }: FilterPillProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
        active
          ? 'bg-neon-cyan text-deep-black shadow-[0_0_12px_rgba(0,255,221,0.3)]'
          : 'bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary border border-text-muted/20'
      }`}
    >
      {label}
    </motion.button>
  )
}
