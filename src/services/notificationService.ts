import { Capacitor } from '@capacitor/core'
import { LocalNotifications, type ScheduleResult } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'

const REMINDER_CHANNEL = 'cashbook-reminders'
const DAILY_REMINDER_ID = 120_001
const REMINDER_SETTINGS_KEY = 'cashbook.notification.settings.v1'

export interface ReminderPreferences {
  dailyEnabled: boolean
  dailyTime: string
}

export interface DebtReminderInput {
  /** Stable database UUID; used to derive a stable native notification ID. */
  debtId: string
  name: string
  dueDate: string | Date
  amountLabel?: string
  daysBefore?: number
  time?: string
  recurrence?: 'none' | 'monthly'
}

const isTauri = () => '__TAURI_INTERNALS__' in window
const parseTime = (time: string) => {
  const [hour, minute] = time.split(':').map(Number)
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error('Time must use HH:mm format.')
  }
  return { hour, minute }
}

/** Deterministic positive Android-compatible 32-bit ID. */
export function notificationIdForDebt(debtId: string) {
  let hash = 0
  for (let index = 0; index < debtId.length; index += 1) hash = ((hash << 5) - hash + debtId.charCodeAt(index)) | 0
  return 200_000 + (Math.abs(hash) % 1_900_000_000)
}

export async function getReminderPreferences(): Promise<ReminderPreferences> {
  const { value } = await Preferences.get({ key: REMINDER_SETTINGS_KEY })
  if (!value) return { dailyEnabled: false, dailyTime: '19:00' }
  try { return { dailyEnabled: false, dailyTime: '19:00', ...JSON.parse(value) } as ReminderPreferences } catch { return { dailyEnabled: false, dailyTime: '19:00' } }
}

async function saveReminderPreferences(settings: ReminderPreferences) {
  await Preferences.set({ key: REMINDER_SETTINGS_KEY, value: JSON.stringify(settings) })
}

export async function requestNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    let permission = await LocalNotifications.checkPermissions()
    if (permission.display !== 'granted') permission = await LocalNotifications.requestPermissions()
    if (permission.display !== 'granted') throw new Error('Notification permission was not granted.')
    if (Capacitor.getPlatform() === 'android') {
      await LocalNotifications.createChannel({
        id: REMINDER_CHANNEL,
        name: 'Cashbook reminders',
        description: 'Daily bookkeeping and loan or debt due-date reminders',
        importance: 4,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#10B981',
      })
    }
    return true
  }

  if (isTauri()) {
    const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification')
    const granted = await isPermissionGranted()
    if (!granted && await requestPermission() !== 'granted') throw new Error('Notification permission was not granted.')
    return true
  }

  if ('Notification' in window) {
    const result = await Notification.requestPermission()
    if (result !== 'granted') throw new Error('Notification permission was not granted.')
    return true
  }
  throw new Error('Notifications are not available on this platform.')
}

/**
 * Registers listeners and the Android channel. Call once after app startup.
 * Permission is never requested here; that must follow a deliberate user action.
 */
export async function initializeNotificationEngine() {
  if (!Capacitor.isNativePlatform()) return
  if (Capacitor.getPlatform() === 'android') {
    await LocalNotifications.createChannel({
      id: REMINDER_CHANNEL,
      name: 'Cashbook reminders',
      description: 'Daily bookkeeping and debt due-date reminders',
      importance: 4,
      visibility: 1,
      vibration: true,
    })
  }
  await LocalNotifications.registerActionTypes({
    types: [{ id: 'OPEN_CASHBOOK', actions: [{ id: 'open', title: 'Open cashbook', foreground: true }] }],
  })
  await LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
    const route = typeof notification.extra?.route === 'string' ? notification.extra.route : '/expenses'
    window.history.pushState({}, '', route)
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
}

export async function scheduleDailyReminder(time = '19:00'): Promise<ScheduleResult | null> {
  const { hour, minute } = parseTime(time)
  await requestNotificationPermission()
  if (Capacitor.isNativePlatform()) {
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] })
    const result = await LocalNotifications.schedule({
      notifications: [{
        id: DAILY_REMINDER_ID,
        title: 'Keep your cashbook current',
        body: "Don't forget to log today's receipts and expenses.",
        channelId: REMINDER_CHANNEL,
        actionTypeId: 'OPEN_CASHBOOK',
        schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
        extra: { route: '/expenses', kind: 'daily-cashbook' },
        isExactNotification: true,
        isExactMandatory: false,
        autoCancel: true,
      }],
    })
    await saveReminderPreferences({ dailyEnabled: true, dailyTime: time })
    return result
  }

  // Desktop stores the preference; the Tauri process can reconcile it at startup.
  await saveReminderPreferences({ dailyEnabled: true, dailyTime: time })
  return null
}

export async function cancelDailyReminder() {
  if (Capacitor.isNativePlatform()) await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] })
  const current = await getReminderPreferences()
  await saveReminderPreferences({ ...current, dailyEnabled: false })
}

/** Schedules 30 concrete quote notifications so each day can contain different text. */
export async function scheduleMotivationalQuotes(quotes: Array<{ text: string; author?: string | null }>, time = '08:00') {
  if (!quotes.length) throw new Error('Add at least one active quote first.')
  const { hour, minute } = parseTime(time)
  await requestNotificationPermission()
  if (!Capacitor.isNativePlatform()) return null
  const oldIds = Array.from({ length: 30 }, (_, index) => ({ id: 130_000 + index }))
  await LocalNotifications.cancel({ notifications: oldIds })
  const start = new Date()
  const notifications = Array.from({ length: 30 }, (_, index) => {
    const at = new Date(start)
    at.setDate(start.getDate() + index + 1)
    at.setHours(hour, minute, 0, 0)
    const quote = quotes[index % quotes.length]
    return {
      id: 130_000 + index,
      title: 'Daily money motivation',
      body: `${quote.text}${quote.author ? ` — ${quote.author}` : ''}`,
      channelId: REMINDER_CHANNEL,
      actionTypeId: 'OPEN_CASHBOOK',
      schedule: { at, allowWhileIdle: true },
      extra: { route: '/quotes', kind: 'money-quote' },
      autoCancel: true,
    }
  })
  return LocalNotifications.schedule({ notifications })
}

export async function cancelMotivationalQuotes() {
  if (!Capacitor.isNativePlatform()) return
  await LocalNotifications.cancel({ notifications: Array.from({ length: 30 }, (_, index) => ({ id: 130_000 + index })) })
}

export async function scheduleDebtReminder(input: DebtReminderInput): Promise<ScheduleResult | null> {
  await requestNotificationPermission()
  const { hour, minute } = parseTime(input.time || '09:00')
  const due = input.dueDate instanceof Date ? new Date(input.dueDate) : new Date(`${input.dueDate}T00:00:00`)
  if (Number.isNaN(due.getTime())) throw new Error('Enter a valid due date.')
  const trigger = new Date(due)
  trigger.setDate(trigger.getDate() - (input.daysBefore ?? 1))
  trigger.setHours(hour, minute, 0, 0)
  if (input.recurrence !== 'monthly' && trigger.getTime() <= Date.now()) throw new Error('The reminder time must be in the future.')

  const id = notificationIdForDebt(input.debtId)
  const daysBefore = input.daysBefore ?? 1
  const dueLabel = daysBefore === 0 ? 'today' : daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`
  const body = `Reminder: ${input.name}${input.amountLabel ? ` (${input.amountLabel})` : ''} is due ${dueLabel}.`
  if (Capacitor.isNativePlatform()) {
    await LocalNotifications.cancel({ notifications: [{ id }] })
    return LocalNotifications.schedule({
      notifications: [{
        id,
        title: 'Loan & debt reminder',
        body,
        channelId: REMINDER_CHANNEL,
        actionTypeId: 'OPEN_CASHBOOK',
        schedule: input.recurrence === 'monthly'
          ? { on: { day: trigger.getDate(), hour, minute }, repeats: true, allowWhileIdle: true }
          : { at: trigger, allowWhileIdle: true },
        extra: { route: '/expenses', kind: 'debt-due', debtId: input.debtId },
        isExactNotification: true,
        isExactMandatory: false,
        autoCancel: true,
      }],
    })
  }
  return null
}

export async function cancelDebtReminder(debtId: string) {
  if (Capacitor.isNativePlatform()) {
    await LocalNotifications.cancel({ notifications: [{ id: notificationIdForDebt(debtId) }] })
  }
}

export async function sendTestNotification() {
  await requestNotificationPermission()
  if (Capacitor.isNativePlatform()) {
    return LocalNotifications.schedule({
      notifications: [{
        id: 120_099,
        title: 'Cashbook reminders are ready',
        body: 'Daily, loan, and debt alerts will appear here.',
        channelId: REMINDER_CHANNEL,
        schedule: { at: new Date(Date.now() + 5_000) },
        extra: { route: '/settings', kind: 'test' },
        autoCancel: true,
      }],
    })
  }
  if (isTauri()) {
    const { sendNotification } = await import('@tauri-apps/plugin-notification')
    sendNotification({ title: 'Cashbook reminders are ready', body: 'Desktop notifications are enabled.' })
    return null
  }
  new Notification('Cashbook reminders are ready', { body: 'Notifications are enabled.' })
  return null
}
