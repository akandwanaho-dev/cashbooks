import { useCallback, useEffect, useState } from 'react'
import { MoreHorizontal, Search, Shield, ShieldOff, UserRound, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useApp } from '@/contexts/AppContext'
import { getSupabaseClient } from '@/lib/supabaseClient'

interface AdminUserRow { user_id: string; username: string; full_name: string; avatar_url: string | null; created_at: string; role: 'admin' | 'user' }

export default function AdminUsers() {
  const { config, user, isDemo } = useApp()
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const client = getSupabaseClient(config)

  const load = useCallback(async () => {
    if (isDemo) { setUsers([{ user_id: 'demo-user', username: 'alex.m', full_name: 'Alex Mugisha', avatar_url: null, created_at: new Date().toISOString(), role: 'admin' }, { user_id: 'demo-sarah', username: 'sarah.k', full_name: 'Sarah Kato', avatar_url: null, created_at: new Date(Date.now() - 86400000 * 14).toISOString(), role: 'user' }, { user_id: 'demo-david', username: 'david.o', full_name: 'David Okello', avatar_url: null, created_at: new Date(Date.now() - 86400000 * 31).toISOString(), role: 'user' }]); setLoading(false); return }
    if (!client) return
    setLoading(true)
    const [profiles, roles] = await Promise.all([client.from('profiles').select('user_id,username,full_name,avatar_url,created_at').order('created_at', { ascending: false }), client.from('user_roles').select('user_id,role')])
    if (profiles.error) toast.error(profiles.error.message)
    const adminIds = new Set((roles.data || []).filter((role) => role.role === 'admin').map((role) => role.user_id))
    setUsers((profiles.data || []).map((profile) => ({ ...profile, role: adminIds.has(profile.user_id) ? 'admin' as const : 'user' as const })))
    setLoading(false)
  }, [client, isDemo])
  useEffect(() => { void load() }, [load])

  const setRole = async (row: AdminUserRow, role: 'admin' | 'user') => {
    if (row.user_id === user?.id && role === 'user') return toast.error('You cannot remove your own administrator role.')
    if (isDemo) { setUsers((current) => current.map((item) => item.user_id === row.user_id ? { ...item, role } : item)); toast.success('Demo role updated'); return }
    if (!client) return
    const result = role === 'admin' ? await client.from('user_roles').upsert({ user_id: row.user_id, role: 'admin' }) : await client.from('user_roles').delete().eq('user_id', row.user_id).eq('role', 'admin')
    if (result.error) return toast.error(result.error.message)
    toast.success('User role updated'); await load()
  }
  const filtered = users.filter((item) => `${item.full_name} ${item.username}`.toLowerCase().includes(search.toLowerCase()))

  return <div className="mx-auto max-w-6xl space-y-6 animate-fade-up"><section><p className="text-sm text-muted-foreground">Profiles and protected roles</p><h2 className="mt-1 text-2xl font-bold tracking-[-.035em]">Users</h2></section><Card><CardContent className="p-0"><div className="border-b p-4"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search users…" className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[680px]"><thead><tr className="border-b bg-muted/30 text-left text-[10px] uppercase tracking-wider text-muted-foreground"><th className="px-5 py-3">User</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Joined</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={4} className="h-48 text-center text-sm text-muted-foreground">Loading users…</td></tr> : filtered.map((row) => <tr key={row.user_id} className="border-b last:border-0"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-muted">{row.avatar_url ? <img src={row.avatar_url} className="h-full w-full object-cover" alt="" /> : <UserRound className="h-4 w-4" />}</span><div><p className="text-sm font-semibold">{row.full_name}</p><p className="text-xs text-muted-foreground">@{row.username}</p></div></div></td><td className="px-5 py-4"><Badge variant={row.role === 'admin' ? 'success' : 'secondary'}>{row.role}</Badge></td><td className="px-5 py-4 text-xs text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</td><td className="px-5 py-4 text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{row.role === 'user' ? <DropdownMenuItem onSelect={() => void setRole(row, 'admin')}><Shield className="h-4 w-4" />Make administrator</DropdownMenuItem> : <DropdownMenuItem onSelect={() => void setRole(row, 'user')} className="text-rose-600"><ShieldOff className="h-4 w-4" />Remove admin role</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></td></tr>)}</tbody></table>{!loading && !filtered.length && <div className="grid h-44 place-items-center text-center"><div><Users className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-2 text-sm font-semibold">No matching users</p></div></div>}</div></CardContent></Card></div>
}
