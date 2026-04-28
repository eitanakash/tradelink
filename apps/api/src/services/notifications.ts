import { prisma } from '../lib/prisma'
import { wsManager } from './websocket'
import type { NotificationType } from '@prisma/client'

export async function createNotification({
  userId, type, title, body, link, emailFn,
}: {
  userId: string
  type: NotificationType
  title: string
  body: string
  link?: string
  emailFn?: () => Promise<void>
}) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, body, link },
  })
  wsManager.send(userId, 'NEW_NOTIFICATION', notification)
  if (!wsManager.isOnline(userId) && emailFn) {
    emailFn().catch((err) => console.error('Email error:', err))
  }
  return notification
}
