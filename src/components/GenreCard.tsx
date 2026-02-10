import { motion } from 'framer-motion'

const GENRE_COLORS = [
  ['#00FFDD', '#8B5CF6'],
  ['#FF2D78', '#8B5CF6'],
  ['#00FFDD', '#FF2D78'],
  ['#8B5CF6', '#FF2D78'],
  ['#00FFDD', '#3B82F6'],
]

export default function GenreCard({ name, onClick, index }: { name: string; onClick: () => void; index: number }) {
  const colors = GENRE_COLORS[index % GENRE_COLORS.length]
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="relative w-full aspect-[2/1] rounded-xl overflow-hidden cursor-pointer group"
      style={{
        background: `linear-gradient(135deg, ${colors[0]}15 0%, ${colors[1]}15 100%)`,
        border: `1px solid ${colors[0]}20`,
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <span className="text-lg font-bold tracking-tight text-center"
          style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >{name}</span>
      </div>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(135deg, ${colors[0]}10 0%, ${colors[1]}10 100%)` }}
      />
    </motion.button>
  )
}
