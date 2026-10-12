import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'

interface State { error: Error | null }
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error): State { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Cashbook UI error', error, info.componentStack) }
  render() {
    if (!this.state.error) return this.props.children
    return <main className="grid min-h-screen place-items-center bg-background p-5"><div className="w-full max-w-md rounded-3xl border bg-card p-7 text-center shadow-2xl"><Logo className="mx-auto w-fit" /><span className="mx-auto mt-8 grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"><AlertTriangle className="h-6 w-6" /></span><h1 className="mt-5 text-2xl font-bold">Something went wrong</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Your saved financial data is safe. Reload the application to continue.</p><Button variant="primary" className="mt-6 w-full" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" />Reload Cashbook</Button><details className="mt-4 text-left"><summary className="cursor-pointer text-xs text-muted-foreground">Technical details</summary><pre className="mt-2 max-h-28 overflow-auto rounded-lg bg-muted p-3 text-[10px]">{this.state.error.message}</pre></details></div></main>
  }
}
