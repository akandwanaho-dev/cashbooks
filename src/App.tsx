import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import AppLayout from '@/components/AppLayout'
import { useApp } from '@/contexts/AppContext'

// Page-level splitting keeps analytics, admin and ledger code out of the first load.
const AuthPage = lazy(() => import('@/pages/auth'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const DatabaseConfiguration = lazy(() => import('@/pages/DatabaseConfiguration'))
const Accounts = lazy(() => import('@/pages/Accounts'))
const Ledger = lazy(() => import('@/pages/Ledger'))
const Notifications = lazy(() => import('@/pages/Notifications'))
const Quotes = lazy(() => import('@/pages/Quotes'))
const Profile = lazy(() => import('@/pages/Profile'))
const SettingsPage = lazy(() => import('@/pages/Settings'))
const About = lazy(() => import('@/pages/About'))
const Downloads = lazy(() => import('@/pages/Downloads'))
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const AdminOverview = lazy(() => import('@/pages/admin/AdminOverview'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
const AdminQuotes = lazy(() => import('@/pages/admin/AdminQuotes'))
const AdminConfig = lazy(() => import('@/pages/admin/AdminConfig'))

function AppLoading() {
  return <div className="grid min-h-screen place-items-center bg-background"><div className="text-center"><Logo /><div className="mx-auto mt-5 h-1 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" /></div><p className="mt-3 text-xs text-muted-foreground">Opening your cash book…</p></div></div>
}

export default function App() {
  const { config, user, authLoading } = useApp()
  if (authLoading) return <AppLoading />
  if (!config) return <Suspense fallback={<AppLoading />}><DatabaseConfiguration /></Suspense>

  if (!user) {
    return <Suspense fallback={<AppLoading />}><Routes><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/signup" element={<AuthPage mode="signup" />} /><Route path="/downloads" element={<main className="min-h-screen bg-background p-4 sm:p-7"><Downloads /></main>} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes></Suspense>
  }

  return <Suspense fallback={<AppLoading />}><Routes>
    <Route element={<AppLayout />}>
      <Route index element={<Dashboard />} />
      <Route path="accounts" element={<Accounts />} />
      <Route path="expenses" element={<Ledger />} />
      <Route path="ledger" element={<Navigate to="/expenses" replace />} />
      <Route path="notifications" element={<Notifications />} />
      <Route path="quotes" element={<Quotes />} />
      <Route path="profile" element={<Profile />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="about" element={<About />} />
      <Route path="downloads" element={<Downloads />} />
    </Route>
    <Route path="admin" element={<AdminLayout />}>
      <Route index element={<AdminOverview />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="quotes" element={<AdminQuotes />} />
      <Route path="notifications" element={<AdminConfig section="notifications" />} />
      <Route path="themes" element={<AdminConfig section="themes" />} />
      <Route path="pages" element={<AdminConfig section="pages" />} />
      <Route path="errors" element={<AdminConfig section="errors" />} />
      <Route path="settings" element={<AdminConfig section="settings" />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense>
}
