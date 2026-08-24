import { createClient } from '@/lib/supabase/server'
import { ArrowUpRight, BriefcaseBusiness, CheckCircle2, CircleDollarSign, FileText, ShieldCheck, WalletCards } from 'lucide-react'

const workspaces = [
  { href: '/marketplace', label: 'Marketplace', detail: 'Browse verified services', icon: BriefcaseBusiness },
  { href: '/orders', label: 'Orders & proposals', detail: 'Track active work', icon: FileText },
  { href: '/wallet', label: 'Wallet & escrow', detail: 'Manage protected funds', icon: WalletCards },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8"><a href="/" className="font-mono text-sm font-bold tracking-widest text-primary">TRAVELTRADE / APP</a><div className="flex items-center gap-3 text-sm"><span className="hidden text-muted-foreground sm:inline">{user?.email ?? 'Preview workspace'}</span><a href="/marketplace" className="rounded-lg border border-border px-3 py-2">Marketplace</a></div></div></header>
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Workspace</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Good morning{user?.email ? '' : ', traveler'}.</h1><p className="mt-2 text-muted-foreground">Your orders, proposals, and protected funds in one place.</p></div><a href="/marketplace" className="w-fit rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">Find a service <ArrowUpRight className="ml-1 inline size-4" /></a></div>
        <div className="mt-8 grid gap-5 md:grid-cols-3"><div className="rounded-2xl border border-border bg-card p-5"><BriefcaseBusiness className="size-5 text-primary" /><p className="mt-6 text-sm text-muted-foreground">Active orders</p><p className="mt-1 text-3xl font-semibold">0</p></div><div className="rounded-2xl border border-border bg-card p-5"><CircleDollarSign className="size-5 text-primary" /><p className="mt-6 text-sm text-muted-foreground">In escrow</p><p className="mt-1 font-mono text-3xl font-semibold">₦0</p></div><div className="rounded-2xl border border-border bg-card p-5"><ShieldCheck className="size-5 text-primary" /><p className="mt-6 text-sm text-muted-foreground">Account status</p><p className="mt-1 text-xl font-semibold">Protected</p></div></div>
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]"><section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Your workspace</h2><span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Ready to begin</span></div><div className="mt-6 grid gap-3">{workspaces.map(({ href, label, detail, icon: Icon }) => <a key={href} href={href} className="flex items-center justify-between rounded-xl border border-border p-4 transition hover:border-primary/40 hover:bg-muted/40"><span className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-muted text-primary"><Icon className="size-5" /></span><span><span className="block font-medium">{label}</span><span className="block text-sm text-muted-foreground">{detail}</span></span></span><ArrowUpRight className="size-4 text-muted-foreground" /></a>)}</div></section><aside className="rounded-2xl bg-primary p-6 text-primary-foreground"><CheckCircle2 className="size-6" /><h2 className="mt-8 text-xl font-semibold">Trust is the product.</h2><p className="mt-2 text-sm leading-6 text-primary-foreground/75">Every agreement is structured around clear milestones, verified partners, and protected payments.</p><a href="/#trust" className="mt-6 inline-block text-sm font-semibold underline underline-offset-4">Learn about protection</a></aside></div>
      </div>
    </main>
  )
}
