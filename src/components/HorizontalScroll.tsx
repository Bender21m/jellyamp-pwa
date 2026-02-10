import { useRef } from 'react'

export default function HorizontalScroll({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div className={`relative ${className}`}>
      <div ref={ref} className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:-mx-8 md:px-8 scroll-smooth scrollbar-hide">
        {children}
      </div>
    </div>
  )
}
