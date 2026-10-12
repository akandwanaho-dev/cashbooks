import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { applyTheme, getTheme, THEME_EVENT, type Theme } from '@/lib/theme'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getTheme())
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const isDark = theme === 'dark' || (theme === 'system' && systemDark)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const syncSystem = () => {
      setSystemDark(media.matches)
      if (theme === 'system') applyTheme('system')
    }
    const syncExternal = (event: Event) => setTheme((event as CustomEvent<Theme>).detail)
    media.addEventListener('change', syncSystem)
    window.addEventListener(THEME_EVENT, syncExternal)
    return () => {
      media.removeEventListener('change', syncSystem)
      window.removeEventListener(THEME_EVENT, syncExternal)
    }
  }, [theme])

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="rounded-xl text-muted-foreground"
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </Button>
  )
}
