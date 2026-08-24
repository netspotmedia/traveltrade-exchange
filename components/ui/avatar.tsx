import { cn } from '@/lib/utils'
import { initials, avatarHue } from '@/lib/format'

// Initials-based avatar with a deterministic, name-derived hue.
function Avatar({ name, className, size = 'md' }: { name?: string | null; className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const hue = avatarHue(name)
  const sizeClass =
    size === 'sm' ? 'size-8 text-xs' : size === 'lg' ? 'size-12 text-base' : size === 'xl' ? 'size-16 text-xl' : 'size-10 text-sm'
  return (
    <span
      data-slot="avatar"
      className={cn('inline-grid shrink-0 place-items-center rounded-full font-semibold text-white', sizeClass, className)}
      style={{ backgroundColor: `oklch(0.55 0.1 ${hue})` }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

export { Avatar }