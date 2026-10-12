import { useState } from 'react'
import { BellRing, ChevronLeft, FileText, LayoutDashboard, Menu, MessageSquareWarning, Palette, Quote, Settings, ShieldCheck, Users, X } from 'lucide-react'
import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { cn } from '@/lib/utils'

const links = [
  { label: 'Overview', path: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Quotes', path: '/admin/quotes', icon: Quote },
  { label: 'Notifications', path: '/admin/notifications', icon: BellRing },
  { label: 'Themes', path: '/admin/themes', icon: Palette },
  { label: 'Pages', path: '/admin/pages', icon: FileText },
  { label: 'Error messages', path: '/admin/errors', icon: MessageSquareWarning },
  { label: 'App settings', path: '/admin/settings', icon: Settings },
]

function AdminNav({ close }: { close?: () => void }) {
  return <><div className="flex h-20 items-center justify-between px-5"><Logo /><Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-400">Admin</Badge></div><nav className="space-y-1 px-3">{links.map(({ label, path, icon: Icon, end }) => <NavLink key={path} to={path} end={end} onClick={close} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:bg-white/[.06] hover:text-white')}><Icon className="h-[18px] w-[18px]" />{label}</NavLink>)}</nav><div className="mt-auto p-4"><Button variant="ghost" asChild className="w-full justify-start text-zinc-400 hover:bg-white/10 hover:text-white"><NavLink to="/"><ChevronLeft className="h-4 w-4" />Back to Cashbook</NavLink></Button><div className="mt-3 rounded-xl border border-white/10 bg-white/[.04] p-3"><p className="flex items-center gap-2 text-xs font-semibold text-emerald-400"><ShieldCheck className="h-4 w-4" />Protected console</p><p className="mt-1 text-[10px] leading-4 text-zinc-500">Role checks are enforced by database RLS.</p></div></div></>
}

export default function AdminLayout() {
  const { isAdmin, workspaceLoading } = useWorkspace()
  const [open, setOpen] = useState(false)
  if (workspaceLoading) return <div className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-400">Checking administrator access…</div>
  if (!isAdmin) return <Navigate to="/" replace />

  return <div className="min-h-screen bg-background"><aside className="fixed inset-y-0 left-0 hidden w-[260px] flex-col bg-zinc-950 text-white lg:flex"><AdminNav /></aside>{open && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close menu" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} /><aside className="relative flex h-full w-[285px] flex-col bg-zinc-950 text-white"><button className="absolute right-4 top-6 p-2 text-zinc-400" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button><AdminNav close={() => setOpen(false)} /></aside></div>}<div className="lg:pl-[260px]"><header className="sticky top-0 z-30 flex h-20 items-center border-b bg-background/90 px-4 backdrop-blur-xl sm:px-7"><Button variant="ghost" size="icon" className="mr-2 lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-600">Administration</p><h1 className="text-lg font-bold">Cashbook Control Center</h1></div><div className="ml-auto"><ThemeToggle /></div></header><main className="p-4 sm:p-7 lg:p-9"><Outlet /></main></div></div>
}
