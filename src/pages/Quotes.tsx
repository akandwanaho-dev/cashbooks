import { useMemo, useState } from 'react'
import { Heart, Lightbulb, Quote, RefreshCw, Share2, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useWorkspace } from '@/contexts/WorkspaceContext'

export default function QuotesPage() {
  const { quotes, isAdmin } = useWorkspace()
  const [index, setIndex] = useState(0)
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set())
  const active = useMemo(() => quotes.filter((quote) => quote.active), [quotes])
  const featured = active[index % Math.max(active.length, 1)]

  const share = async (text: string) => {
    try {
      if (navigator.share) await navigator.share({ title: 'Money motivation', text })
      else { await navigator.clipboard.writeText(text); toast.success('Quote copied') }
    } catch { /* User cancelled the share sheet. */ }
  }

  return <div className="mx-auto max-w-5xl space-y-6 animate-fade-up">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm text-muted-foreground">Build a healthier money mindset</p><h2 className="mt-1 text-2xl font-bold tracking-[-.035em] sm:text-3xl">Money motivation</h2></div>{isAdmin && <Button variant="outline" asChild><Link to="/admin/quotes"><Shield className="h-4 w-4" />Manage quotes</Link></Button>}</section>
    {featured ? <div className="relative overflow-hidden rounded-3xl bg-zinc-950 p-7 text-white shadow-2xl sm:p-10"><div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-emerald-500/15 blur-3xl" /><Quote className="h-9 w-9 text-emerald-400" /><blockquote className="relative mt-6 max-w-3xl text-2xl font-semibold leading-relaxed tracking-[-.025em] sm:text-4xl">“{featured.text}”</blockquote><div className="relative mt-7 flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium text-zinc-200">{featured.author || 'Cashbook'}</p><Badge className="mt-2 border-white/10 bg-white/10 text-zinc-300">{featured.category}</Badge></div><div className="flex gap-2"><Button variant="ghost" className="text-zinc-300 hover:bg-white/10 hover:text-white" onClick={() => setIndex((value) => value + 1)}><RefreshCw className="h-4 w-4" />Another</Button><Button variant="primary" onClick={() => void share(`${featured.text} — ${featured.author || 'Cashbook'}`)}><Share2 className="h-4 w-4" />Share</Button></div></div></div> : <Card><CardContent className="grid h-56 place-items-center text-center"><div><Lightbulb className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 font-semibold">No active quotes yet</p></div></CardContent></Card>}
    <section><h3 className="mb-4 text-lg font-bold">Explore all quotes</h3><div className="grid gap-4 md:grid-cols-2">{active.map((item) => <Card key={item.id} className="transition hover:shadow-lg"><CardContent className="p-5"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><Quote className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium leading-6">“{item.text}”</p><p className="mt-3 text-xs text-muted-foreground">{item.author || 'Cashbook'} · {item.category}</p></div></div><div className="mt-4 flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => setFavorites((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next })} aria-label="Favorite quote"><Heart className={`h-4 w-4 ${favorites.has(item.id) ? 'fill-rose-500 text-rose-500' : ''}`} /></Button><Button variant="ghost" size="icon" onClick={() => void share(item.text)} aria-label="Share quote"><Share2 className="h-4 w-4" /></Button></div></CardContent></Card>)}</div></section>
  </div>
}
