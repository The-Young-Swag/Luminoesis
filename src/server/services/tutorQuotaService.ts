import { createHash, randomUUID } from 'node:crypto'
import type { Request, Response } from 'express'

import { db } from '../infrastructure/database/client.js'

export const MAX_ONLINE_UPLOADS = 3
const COOKIE_NAME = 'tutor_uid'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/**
 * Anonymous-user identification for the portfolio 3-upload safeguard.
 *
 * This is our application-level safety limit, NOT Google's quota.
 * Local AI usage does not consume the allowance.
 *
 * Strategy:
 * - Primary: random UUID stored in HttpOnly cookie `tutor_uid`
 * - Fallback: hash of IP + User-Agent if cookie is missing (less stable)
 *
 * Honest limitation: anonymous identification is not strong authentication.
 * A determined user can clear cookies or change networks. This is sufficient
 * for a portfolio demo with zero required monthly cost and no login.
 */
export function getFingerprint(req: Request, res: Response): string {
  const cookieId = parseCookie(req.headers.cookie ?? '')[COOKIE_NAME]

  if (cookieId && /^[0-9a-f-]{36}$/i.test(cookieId)) {
    return `cookie:${cookieId}`
  }

  // Ensure cookie for next request
  const newId = randomUUID()
  res.cookie(COOKIE_NAME, newId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE * 1000,
    path: '/',
  })

  // Fallback fingerprint for this request before cookie sticks
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
  const ua = req.headers['user-agent'] ?? 'unknown'
  const hash = createHash('sha256').update(`${ip}:${ua}:${newId}`).digest('hex').slice(0, 16)
  return `anon:${hash}`
}

function parseCookie(header: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const [rawKey, ...rawVal] = part.trim().split('=')
    if (!rawKey) continue
    out[rawKey] = decodeURIComponent(rawVal.join('='))
  }
  return out
}

export function getUploadCount(fingerprint: string): number {
  const row = db
    .prepare('SELECT count FROM tutor_uploads WHERE fingerprint = ?')
    .get(fingerprint) as { count: number } | undefined
  return row?.count ?? 0
}

export function consumeUpload(fingerprint: string): number {
  const current = getUploadCount(fingerprint)
  const next = current + 1
  const now = new Date().toISOString()
  db.prepare(
    'INSERT INTO tutor_uploads (fingerprint, count, updated_at) VALUES (?, ?, ?) ON CONFLICT(fingerprint) DO UPDATE SET count = excluded.count, updated_at = excluded.updated_at',
  ).run(fingerprint, next, now)
  return next
}

export function getRemaining(fingerprint: string): number {
  return Math.max(0, MAX_ONLINE_UPLOADS - getUploadCount(fingerprint))
}
