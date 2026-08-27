import { LogOut } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

/** Server action form — sign the current user out and return to marketing. */
export function SignOutButton({ compact = true, className }: { compact?: boolean; className?: string }) {
  return (
    <form
      action={async () => {
        'use server'
        const s = await createClient()
        await s.auth.signOut()
        redirect('/')
      }}
    >
      <button
        type="submit"
        aria-label="Sign out"
        className={cn(
          compact
            ? 'grid size-9 shrink-0 place-items-center rounded-lg text-on-surface-variant transition-colors duration-200 hover:bg-surface-container-high hover:text-destructive'
            : 'inline-flex w-full items-center justify-center rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted hover:text-foreground',
          className,
        )}
      >
        <LogOut className="size-4" aria-hidden="true" />
        {!compact && <span className="ml-2">Sign out</span>}
      </button>
    </form>
  )
}