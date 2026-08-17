/**
 * In-memory notification store (Reopen task §12/13). Real state for
 * testing — recipient, createdAt, read/unread, sessionId, type — but no
 * external channel (no Telegram/email/push). Mounted at the App root so
 * both the Admin/Kế toán branch (which creates notifications on Reopen) and
 * the CS/Leader branch (which reads them) share the same live list.
 *
 * Dedup for reminder milestones is enforced by the CALLER (reopenStore.ts's
 * reminder ticker), keyed exactly per `reminderDedupeKeyString` from
 * `notificationContract.ts` — this store itself just stores whatever it's
 * told to and never re-derives/re-sends on its own.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type NotificationType = 'SESSION_REOPENED' | 'REMINDER_24H' | 'REMINDER_12H' | 'REMINDER_LEADER_SUMMARY'

export interface AppNotification {
  id: string
  type: NotificationType
  recipientUserId: string
  sessionId: string
  message: string
  createdAt: string
  read: boolean
}

interface NotificationStoreValue {
  notifications: AppNotification[]
  getForUser: (userId: string) => AppNotification[]
  getUnreadCountForUser: (userId: string) => number
  push: (input: { type: NotificationType; recipientUserId: string; sessionId: string; message: string }) => void
  markRead: (id: string) => void
  markAllReadForUser: (userId: string) => void
}

const NotificationStoreContext = createContext<NotificationStoreValue | null>(null)

let notifSeq = 0

function nowStamp(): string {
  const d = new Date()
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function NotificationStoreProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const push = useCallback((input: { type: NotificationType; recipientUserId: string; sessionId: string; message: string }) => {
    setNotifications(prev => [
      { id: `notif-${++notifSeq}`, ...input, createdAt: nowStamp(), read: false },
      ...prev,
    ])
  }, [])

  const getForUser = useCallback(
    (userId: string) => notifications.filter(n => n.recipientUserId === userId),
    [notifications],
  )

  const getUnreadCountForUser = useCallback(
    (userId: string) => notifications.filter(n => n.recipientUserId === userId && !n.read).length,
    [notifications],
  )

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllReadForUser = useCallback((userId: string) => {
    setNotifications(prev => prev.map(n => (n.recipientUserId === userId ? { ...n, read: true } : n)))
  }, [])

  const value = useMemo<NotificationStoreValue>(
    () => ({ notifications, getForUser, getUnreadCountForUser, push, markRead, markAllReadForUser }),
    [notifications, getForUser, getUnreadCountForUser, push, markRead, markAllReadForUser],
  )

  return <NotificationStoreContext.Provider value={value}>{children}</NotificationStoreContext.Provider>
}

export function useNotificationStore(): NotificationStoreValue {
  const ctx = useContext(NotificationStoreContext)
  if (!ctx) throw new Error('useNotificationStore must be used within a NotificationStoreProvider')
  return ctx
}
