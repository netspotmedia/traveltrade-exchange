import { createClient } from '@/lib/supabase/server'
import { HeaderBar } from '@/components/layout/header-bar'
import { Logo } from '@/components/layout/logo'

/** Marketing site header. Fetches auth state and the CMS logo on the server,
 *  delegates all presentation (scroll-aware surfacing, active links, mobile
 *  menu) to the client HeaderBar. `overlay` lets the homepage start
 *  transparent. */
export async function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <HeaderBar signedIn={Boolean(user)} overlay={overlay} logo={<Logo />} />
}