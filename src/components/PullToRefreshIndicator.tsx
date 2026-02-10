import { motion, AnimatePresence } from 'framer-motion'

interface PullToRefreshIndicatorProps {
  isVisible: boolean
  isRefreshing: boolean
  shouldTrigger: boolean
  progress: number
}

export default function PullToRefreshIndicator({ 
  isVisible, 
  isRefreshing, 
  shouldTrigger, 
  progress 
}: PullToRefreshIndicatorProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-0 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
          style={{ 
            transform: `translate(-50%, ${Math.max(0, progress * 60 - 40)}px)`
          }}
        >
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
              shouldTrigger || isRefreshing 
                ? 'bg-gradient-to-r from-neon-cyan to-neon-pink shadow-[0_0_20px_rgba(0,255,221,0.3)]'
                : 'bg-white/10 backdrop-blur-sm border border-white/20'
            }`}
          >
            {isRefreshing ? (
              <motion.svg
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                viewBox="0 0 24 24"
                className="w-4 h-4 text-deep-black"
                fill="currentColor"
              >
                <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" />
              </motion.svg>
            ) : (
              <motion.svg
                style={{ 
                  transform: `rotate(${progress * 180}deg)`,
                  transition: 'transform 0.1s ease-out'
                }}
                viewBox="0 0 24 24"
                className={`w-4 h-4 ${shouldTrigger ? 'text-deep-black' : 'text-white'}`}
                fill="currentColor"
              >
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
              </motion.svg>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}