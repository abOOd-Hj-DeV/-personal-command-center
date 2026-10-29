import { addDaysISO, diffDaysISO, isoRange, todayISO, weekStartISO } from './dates'
import type { Activity, Category, DayClass, ISODate } from './types'

// ── Measurable metrics (raw, no interpretation) ──────────────────────

export function dayMinutes(activities: Activity[], date: ISODate): number {
  return activities.reduce((s, a) => (a.date === date ? s + (a.minutes ?? 0) : s), 0)
}

export function dayCompleted(activities: Activity[], date: ISODate): number {
  return activities.reduce((s, a) => (a.date === date && a.completed ? s + 1 : s), 0)
}

export function minutesByCategory(activities: Activity[], start: ISODate, end: ISODate) {
  const map = new Map<string, number>()
  for (const a of activities) {
    if (a.date >= start && a.date <= end) {
      map.set(a.categoryId, (map.get(a.categoryId) ?? 0) + (a.minutes ?? 0))
    }
  }
  return map
}

export function tasksInRange(activities: Activity[], start: ISODate, end: ISODate) {
  let completed = 0
  let total = 0
  for (const a of activities) {
    if (a.date >= start && a.date <= end && (a.kind === 'task' || a.kind === 'time')) {
      total++
      if (a.completed) completed++
    }
  }
  return { completed, total }
}

/** A day counts as "active" if it has >= threshold minutes OR >=1 completed entry. */
export function isActiveDay(activities: Activity[], date: ISODate, activeMinutes: number): boolean {
  return dayMinutes(activities, date) >= activeMinutes || dayCompleted(activities, date) >= 1
}

export function activeDaysInRange(
  activities: Activity[],
  start: ISODate,
  end: ISODate,
  activeMinutes: number,
): number {
  const dates = new Set(
    activities
      .filter((a) => a.date >= start && a.date <= end && ((a.minutes ?? 0) >= activeMinutes || a.completed))
      .map((a) => a.date),
  )
  return dates.size
}

/** Consecutive active days ending today; if today is not active yet, ending yesterday. */
export function currentStreak(
  activities: Activity[],
  activeMinutes: number,
  today: ISODate = todayISO(),
): number {
  let end = today
  if (!isActiveDay(activities, today, activeMinutes)) end = addDaysISO(today, -1)
  let streak = 0
  while (isActiveDay(activities, end, activeMinutes)) {
    streak++
    end = addDaysISO(end, -1)
  }
  return streak
}

// ── Computed indices (formulas documented, never hidden) ─────────────

/**
 * Consistency index for a period: active days / total days × 100.
 * This is a transparent composite — NOT a skill rating.
 */
export function consistencyIndex(
  activities: Activity[],
  start: ISODate,
  end: ISODate,
  activeMinutes: number,
  today: ISODate = todayISO(),
): number {
  const last = end > today ? today : end
  const days = diffDaysISO(start, last) + 1
  if (days <= 0) return 0
  return Math.round((activeDaysInRange(activities, start, last, activeMinutes) / days) * 100)
}

/** Weekly completion rate: completed entries / all entries in range (0-100). */
export function completionRate(activities: Activity[], start: ISODate, end: ISODate): number {
  const { completed, total } = tasksInRange(activities, start, end)
  return total === 0 ? 0 : Math.round((completed / total) * 100)
}

// ── Chart series ─────────────────────────────────────────────────────

export type ChartMetric =
  | 'minutes' // measurable: total focused minutes
  | 'tasks' // measurable: completed entries
  | 'consistency' // computed: rolling 7-day active %
  | 'quality' // computed: day classification mapped 1-4

export const QUALITY_SCORE: Record<DayClass, number> = {
  difficult: 1,
  acceptable: 2,
  good: 3,
  exceptional: 4,
}

export interface SeriesPoint {
  date: ISODate
  value: number
}

/**
 * Per-day series for a metric. `quality` needs day classifications passed
 * as a map date→class. Consistency uses a trailing 7-day window.
 */
export function dailySeries(
  metric: ChartMetric,
  activities: Activity[],
  classes: Map<ISODate, DayClass>,
  start: ISODate,
  end: ISODate,
  activeMinutes: number,
  categoryId?: string,
): SeriesPoint[] {
  const days = isoRange(start, end)
  const filtered = categoryId ? activities.filter((a) => a.categoryId === categoryId) : activities
  return days.map((date) => {
    switch (metric) {
      case 'minutes':
        return { date, value: dayMinutes(filtered, date) }
      case 'tasks':
        return { date, value: dayCompleted(filtered, date) }
      case 'consistency': {
        const s = addDaysISO(date, -6)
        return { date, value: consistencyIndex(filtered, s, date, activeMinutes, date) }
      }
      case 'quality': {
        const c = classes.get(date)
        return { date, value: c ? QUALITY_SCORE[c] : 0 }
      }
    }
  })
}

export type Bucket = 'day' | 'week' | 'month' | 'year'

function bucketKey(iso: ISODate, bucket: Bucket): string {
  switch (bucket) {
    case 'day':
      return iso
    case 'week':
      return weekStartISO(iso)
    case 'month':
      return iso.slice(0, 7)
    case 'year':
      return iso.slice(0, 4)
  }
}

/** Aggregate a daily series into buckets. 'quality' and 'consistency' average; others sum. */
export function bucketSeries(series: SeriesPoint[], bucket: Bucket, average = false): SeriesPoint[] {
  if (bucket === 'day') return series
  const map = new Map<string, { sum: number; n: number }>()
  for (const p of series) {
    const k = bucketKey(p.date, bucket)
    const cur = map.get(k) ?? { sum: 0, n: 0 }
    cur.sum += p.value
    cur.n += 1
    map.set(k, cur)
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, { sum, n }]) => ({
      date,
      value: average && n > 0 ? Math.round((sum / n) * 10) / 10 : sum,
    }))
}
