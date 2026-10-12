import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import App from '@/App'
import CurrencyAccountSync from '@/components/CurrencyAccountSync'
import ErrorBoundary from '@/components/ErrorBoundary'
import GlobalConfigSync from '@/components/GlobalConfigSync'
import { AppProvider } from '@/contexts/AppContext'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { WorkspaceProvider } from '@/contexts/WorkspaceContext'
import { applyTheme, getTheme } from '@/lib/theme'
import { initializeNotificationEngine } from '@/services/notificationService'
import '@/index.css'

applyTheme(getTheme())
void initializeNotificationEngine().catch(() => undefined)
void navigator.storage?.persist?.().catch(() => undefined)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <CurrencyProvider>
          <AppProvider>
            <WorkspaceProvider>
              <CurrencyAccountSync />
              <GlobalConfigSync />
              <App />
              <Toaster position="top-right" richColors closeButton theme="system" />
            </WorkspaceProvider>
          </AppProvider>
        </CurrencyProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
