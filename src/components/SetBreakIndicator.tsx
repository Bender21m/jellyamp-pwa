import { motion } from 'framer-motion'

interface SetBreakIndicatorProps {
  label: string
}

export default function SetBreakIndicator({ label }: SetBreakIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex items-center justify-center py-4 px-6 my-2"
    >
      <div className="flex items-center gap-4 w-full max-w-md">
        {/* Left gradient line */}
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-neon-cyan/60 to-neon-pink/60"></div>
        
        {/* Label */}
        <span className="text-[10px] font-mono font-semibold tracking-wider text-text-muted/60 uppercase whitespace-nowrap">
          {label}
        </span>
        
        {/* Right gradient line */}
        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-neon-pink/60 to-neon-cyan/60"></div>
      </div>
    </motion.div>
  )
}