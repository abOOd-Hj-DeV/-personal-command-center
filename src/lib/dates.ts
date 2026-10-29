import type { ISODate } from './types'

// All helpers treat ISODate as a local-timezone calendar date.
// We intentionally avoid Date('YYYY-MM-DD') parsing (UTC in JS).

export function todayISO(now: Date = new Date()): ISODate {
  return toISO(now)
}

export function toISO(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDaysISO(iso: ISODate, days: number): ISODate {
  const d = fromISO(iso)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

/** Monday of the week containing `iso` (weeks start Monday). */
export function weekStartISO(iso: ISODate): ISODate {
  const d = fromISO(iso)
  const dow = d.getDay() // 0 Sun .. 6 Sat
  const shift = (dow + 6) % 7 // days since Monday
  d.setDate(d.getDate() - shift)
  return toISO(d)
}

export function diffDaysISO(a: ISODate, b: ISODate): number {
  // b - a in whole days
  const ms = fromISO(b).getTime() - fromISO(a).getTime()
  return Math.round(ms / 86400000)
}

export function isoRange(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = []
  let cur = start
  while (cur <= end) {
    out.push(cur)
    cur = addDaysISO(cur, 1)
  }
  return out
}

export function formatMinutes(min: number): string {
  if (min <= 0) return '0'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
