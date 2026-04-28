import { Resend } from 'resend'
import { prisma } from '../lib/prisma'
import { wsManager } from './websocket'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM || 'Tradelink <noreply@tradelink.app>'
const APP_URL = process.env.APP_URL || 'http://localhost:5173'

async function getUserEmail(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
  return user?.email ?? null
}

export async function sendIfOffline(userId: string, emailFn: (email: string) => Promise<void>) {
  if (wsManager.isOnline(userId)) return
  const email = await getUserEmail(userId)
  if (!email) return
  try {
    await emailFn(email)
  } catch (err) {
    console.error('Email send failed:', err)
  }
}

function layout(body: string) {
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
    <h2 style="font-size:18px;margin-bottom:4px">Tradelink</h2>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
    ${body}
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
    <p style="font-size:12px;color:#999">You're receiving this because of activity on your Tradelink account.</p>
  </div>`
}

function btn(label: string, url: string) {
  return `<p style="margin-top:16px"><a href="${url}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600">${label}</a></p>`
}

export async function notifyNewQuote(userId: string, opts: { clientName: string; contractorName: string; jobTitle: string }) {
  if (!resend) return
  await sendIfOffline(userId, async (email) => {
    await resend!.emails.send({ from: FROM, to: email,
      subject: `You received a new quote from ${opts.contractorName}`,
      html: layout(`<p>Hi ${opts.clientName},</p><p><strong>${opts.contractorName}</strong> submitted a quote for your job: <em>${opts.jobTitle}</em>.</p>${btn('View Quote', APP_URL)}`),
    })
  })
}

export async function notifyQuoteAccepted(userId: string, opts: { contractorName: string; clientName: string; jobTitle: string }) {
  if (!resend) return
  await sendIfOffline(userId, async (email) => {
    await resend!.emails.send({ from: FROM, to: email,
      subject: `Your quote was accepted! 🎉`,
      html: layout(`<p>Hi ${opts.contractorName},</p><p>Great news! <strong>${opts.clientName}</strong> accepted your quote for <em>${opts.jobTitle}</em>.</p>${btn('View Job', APP_URL)}`),
    })
  })
}

export async function notifyQuoteRejected(userId: string, opts: { contractorName: string; jobTitle: string }) {
  if (!resend) return
  await sendIfOffline(userId, async (email) => {
    await resend!.emails.send({ from: FROM, to: email,
      subject: `Update on your quote for ${opts.jobTitle}`,
      html: layout(`<p>Hi ${opts.contractorName},</p><p>The client chose a different contractor for <em>${opts.jobTitle}</em>. Keep applying — there are more jobs waiting for your skills!</p>`),
    })
  })
}

export async function notifyNewMessage(userId: string, opts: { recipientName: string; senderName: string; jobTitle: string; preview: string }) {
  if (!resend) return
  await sendIfOffline(userId, async (email) => {
    await resend!.emails.send({ from: FROM, to: email,
      subject: `${opts.senderName} sent you a message`,
      html: layout(`<p>Hi ${opts.recipientName},</p><p><strong>${opts.senderName}</strong> sent you a message about <em>${opts.jobTitle}</em>:</p><blockquote style="border-left:3px solid #e5e7eb;padding-left:12px;color:#555;margin:12px 0">${opts.preview}</blockquote>${btn('Reply', APP_URL)}`),
    })
  })
}

export async function notifyNewJobInArea(userId: string, opts: { contractorName: string; jobTitle: string; category: string; city: string }) {
  if (!resend) return
  await sendIfOffline(userId, async (email) => {
    await resend!.emails.send({ from: FROM, to: email,
      subject: `New ${opts.category} job in ${opts.city}`,
      html: layout(`<p>Hi ${opts.contractorName},</p><p>A new <strong>${opts.category}</strong> job was posted in <strong>${opts.city}</strong>: <em>${opts.jobTitle}</em>.</p>${btn('View and Quote', APP_URL)}`),
    })
  })
}
