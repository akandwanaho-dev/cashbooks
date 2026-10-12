import { Landmark } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/20">
        <Landmark className="h-[18px] w-[18px]" strokeWidth={2.4} />
      </span>
      {!compact && <span className="text-[17px] font-bold tracking-[-.03em]">Cashbook<span className="text-emerald-500">.</span></span>}
    </div>
  )
}
