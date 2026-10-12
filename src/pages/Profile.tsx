import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Camera, Mail, Phone, Save, ShieldCheck, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApp } from '@/contexts/AppContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { initials } from '@/lib/utils'

export default function ProfilePage() {
  const { user } = useApp()
  const { profile, isAdmin, updateProfile, uploadAvatar } = useWorkspace()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ username: '', full_name: '', phone: '', bio: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { if (profile) setForm({ username: profile.username, full_name: profile.full_name, phone: profile.phone || '', bio: profile.bio || '' }) }, [profile])
  if (!profile) return <div className="h-72 animate-pulse rounded-2xl bg-muted" />

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true)
    try { await updateProfile({ ...form, phone: form.phone || null, bio: form.bio || null, onboarding_completed: true }); toast.success('Profile updated') }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update profile.') }
    finally { setSaving(false) }
  }
  const upload = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return toast.error('Choose an image smaller than 5 MB.')
    setUploading(true)
    try { await uploadAvatar(file); toast.success('Profile picture updated') }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not upload the image.') }
    finally { setUploading(false) }
  }

  return <div className="mx-auto max-w-4xl space-y-6 animate-fade-up">
    <section><p className="text-sm text-muted-foreground">Your public and private details</p><h2 className="mt-1 text-2xl font-bold tracking-[-.035em] sm:text-3xl">Profile</h2></section>
    <Card><CardContent className="p-6 sm:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-center"><div className="relative"><span className="grid h-24 w-24 place-items-center overflow-hidden rounded-3xl bg-emerald-100 text-xl font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{profile.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" /> : initials(profile.full_name || user?.email)}</span><button onClick={() => fileRef.current?.click()} className="absolute -bottom-2 -right-2 grid h-9 w-9 place-items-center rounded-xl border bg-card shadow-lg" aria-label="Change profile picture"><Camera className="h-4 w-4" /></button><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-bold">{profile.full_name || profile.username}</h3>{isAdmin && <Badge variant="success"><ShieldCheck className="h-3 w-3" />Administrator</Badge>}</div><p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" />{user?.email}</p>{profile.phone && <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-4 w-4" />{profile.phone}</p>}<Button variant="link" className="mt-1 h-auto p-0 text-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload a new picture'}</Button></div></div></CardContent></Card>
    <Card><CardHeader><CardTitle>Edit profile</CardTitle><CardDescription>Keep your identity and contact information current.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="grid gap-5"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="full-name">Full name</Label><Input id="full-name" required value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="username">Username</Label><div className="relative"><UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="username" required pattern="[a-zA-Z0-9._-]+" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className="pl-10" /></div></div></div><div className="space-y-2"><Label htmlFor="phone">Phone number</Label><Input id="phone" type="tel" placeholder="+256…" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="bio">About you</Label><textarea id="bio" rows={4} maxLength={300} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15" /></div><div><Button variant="primary" type="submit" disabled={saving}><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save profile'}</Button></div></form></CardContent></Card>
  </div>
}
