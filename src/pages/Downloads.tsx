import { Apple, BadgeCheck, Download, FileCheck2, Globe2, Laptop, MonitorDown, Smartphone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const readyBuilds = [
  {
    platform: 'Android',
    detail: 'Universal debug APK · Android 7.0+',
    file: 'Cashbook-1.0.0-android-debug.apk',
    href: '/downloads/Cashbook-1.0.0-android-debug.apk',
    icon: Smartphone,
  },
  {
    platform: 'Web',
    detail: 'Production static site bundle',
    file: 'Cashbook-1.0.0-web.zip',
    href: '/downloads/Cashbook-1.0.0-web.zip',
    icon: Globe2,
  },
] as const

const hostBuilds = [
  { platform: 'iPhone & iPad', detail: 'The signed IPA must be produced with Xcode and an Apple Developer identity.', icon: Apple },
  { platform: 'macOS', detail: 'The signed DMG must be produced and notarized on a Mac.', icon: MonitorDown },
  { platform: 'Windows', detail: 'The MSI/NSIS installer must be produced and signed on a Windows build host.', icon: MonitorDown },
  { platform: 'Linux desktop', detail: 'The current Debian package must be produced on a Linux host with the WebKitGTK build libraries.', icon: Laptop },
] as const

export default function Downloads() {
  return <div className="mx-auto max-w-6xl space-y-8 animate-fade-up">
    <section className="relative overflow-hidden rounded-3xl bg-zinc-950 px-6 py-10 text-white sm:px-10 sm:py-12">
      <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="relative max-w-2xl">
        <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-300"><BadgeCheck className="h-3.5 w-3.5" />Verified release files</Badge>
        <h2 className="mt-5 text-3xl font-bold tracking-[-.04em] sm:text-4xl">Download Cashbook</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-400">Install a generated build or download the production web bundle. Verify downloads with the published SHA-256 checksum file.</p>
        <Button asChild variant="outline" className="mt-6 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
          <a href="/downloads/SHA256SUMS.txt" download><FileCheck2 className="h-4 w-4" />Download checksums</a>
        </Button>
      </div>
    </section>

    <section>
      <div><p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Available now</p><h3 className="mt-1 text-2xl font-bold">Generated builds</h3></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {readyBuilds.map(({ platform, detail, file, href, icon: Icon }) => <Card key={platform} className="flex flex-col">
          <CardHeader><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><Icon className="h-5 w-5" /></span><CardTitle className="mt-4">{platform}</CardTitle><CardDescription>{detail}</CardDescription></CardHeader>
          <CardContent className="mt-auto"><p className="mb-4 break-all font-mono text-[10px] text-muted-foreground">{file}</p><Button asChild variant="primary" className="w-full"><a href={href} download={file}><Download className="h-4 w-4" />Download</a></Button></CardContent>
        </Card>)}
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">The Android file is a valid test/debug build and is not Play Store signed. Android may ask you to allow installation from your browser or file manager.</p>
    </section>

    <section>
      <div><p className="text-sm font-semibold text-muted-foreground">Platform signing required</p><h3 className="mt-1 text-2xl font-bold">Release-host builds</h3></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {hostBuilds.map(({ platform, detail, icon: Icon }) => <Card key={platform} className="bg-muted/20"><CardHeader><span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground"><Icon className="h-[18px] w-[18px]" /></span><CardTitle className="mt-3 text-base">{platform}</CardTitle><CardDescription className="leading-5">{detail}</CardDescription></CardHeader><CardContent><Button variant="outline" disabled className="w-full">Build host required</Button></CardContent></Card>)}
      </div>
    </section>
  </div>
}
