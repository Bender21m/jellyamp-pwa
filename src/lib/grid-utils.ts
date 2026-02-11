import type { GridDensity } from '../stores/ui'

export function getGridClasses(density: GridDensity): string {
  const baseClasses = 'grid gap-5 md:gap-6 lg:gap-7'
  
  switch (density) {
    case 'normal':
      return `${baseClasses} grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6`
    case 'compact':
      return `${baseClasses} grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7`
    case 'dense':
      return `${baseClasses} grid-cols-4 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8`
    default:
      return `${baseClasses} grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6`
  }
}