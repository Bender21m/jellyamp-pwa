import React from 'react'
import { motion } from 'framer-motion'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick: () => void
  }
}

const EmptyState = React.memo(function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 px-8 text-center"
    >
      <div className="text-text-muted/30 mb-6">
        {icon}
      </div>
      
      <h3 className="text-lg font-semibold text-text-secondary mb-2">
        {title}
      </h3>
      
      {subtitle && (
        <p className="text-sm text-text-muted mb-6 max-w-sm">
          {subtitle}
        </p>
      )}
      
      {action && (
        <motion.button
          onClick={action.onClick}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-2.5 bg-gradient-primary text-deep-black font-semibold rounded-full text-sm hover:shadow-[0_0_20px_rgba(0,255,221,0.3)] transition-shadow"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  )
})

export default EmptyState