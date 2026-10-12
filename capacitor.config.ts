import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.cashbook.app',
  appName: 'Cashbook',
  webDir: 'dist',
  backgroundColor: '#09090b',
  loggingBehavior: 'debug',
  appendUserAgent: ' CashbookNative/1.0',
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_cashbook',
      iconColor: '#10B981',
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
  },
}

export default config
