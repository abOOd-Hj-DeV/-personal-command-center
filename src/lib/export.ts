import { db, getAllPrefs } from './db'
import type { Prefs } from './types'

export const EXPORT_VERSION = 1

export interface ExportBundle {
  version: number
  exportedAt: string
  categories: unknown[]
  activities: unknown[]
  dayRecords: unknown[]
  projects: unknown[]
  milestones: unknown[]
  weeklyReviews: unknown[]
  prefs: Prefs
}

export async function exportAll(): Promise<ExportBundle> {
  const [categories, activities, dayRecords, projects, milestones, weeklyReviews, prefs] =
    await Promise.all([
      db.categories.toArray(),
      db.activities.toArray(),
      db.dayRecords.toArray(),
      db.projects.toArray(),
      db.milestones.toArray(),
      db.weeklyReviews.toArray(),
      getAllPrefs(),
    ])
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    categories,
    activities,
    dayRecords,
    projects,
    milestones,
    weeklyReviews,
    prefs,
  }
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export interface ImportResult {
  imported: Record<string, number>
  skipped: number
  errors: string[]
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function validateArray(v: unknown, name: string, requiredFields: string[], errors: string[]): Record<string, unknown>[] {
  if (v === undefined) return []
  if (!Array.isArray(v)) {
    errors.push(`${name}: not an array`)
    return []
  }
  return v.filter((row, i) => {
    if (!isObj(row)) {
      errors.push(`${name}[${i}]: not an object`)
      return false
    }
    for (const f of requiredFields) {
      if (!(f in row)) {
        errors.push(`${name}[${i}]: missing ${f}`)
        return false
      }
    }
    return true
  })
}

/**
 * Merge-import with validation. Records are keyed by their primary key;
 * when a record already exists locally, the copy with the NEWER updatedAt
 * wins — importing never destroys newer local data.
 */
export async function importBundle(raw: unknown): Promise<ImportResult> {
  const errors: string[] = []
  const result: ImportResult = { imported: {}, skipped: 0, errors }
  if (!isObj(raw)) {
    errors.push('file is not a JSON object')
    return result
  }
  if (raw.version !== EXPORT_VERSION) {
    errors.push(`unsupported version: ${String(raw.version)} (expected ${EXPORT_VERSION})`)
    return result
  }

  async function merge<T extends { id?: string; date?: string; weekStart?: string; updatedAt?: number }>(
    table: { get: (k: string) => Promise<T | undefined>; put: (v: T) => Promise<unknown> },
    rows: Record<string, unknown>[],
    keyOf: (r: T) => string,
    name: string,
  ) {
    let n = 0
    for (const r of rows) {
      const rec = r as T
      const key = keyOf(rec)
      const existing = await table.get(key)
      if (existing && (existing.updatedAt ?? 0) >= (rec.updatedAt ?? 0)) {
        result.skipped++
        continue
      }
      await table.put(rec)
      n++
    }
    result.imported[name] = n
  }

  const categories = validateArray(raw.categories, 'categories', ['id', 'labelAr', 'labelEn'], errors)
  const activities = validateArray(raw.activities, 'activities', ['id', 'date', 'categoryId'], errors)
  const dayRecords = validateArray(raw.dayRecords, 'dayRecords', ['date'], errors)
  const projects = validateArray(raw.projects, 'projects', ['id', 'title'], errors)
  const milestones = validateArray(raw.milestones, 'milestones', ['id', 'projectId', 'title'], errors)
  const reviews = validateArray(raw.weeklyReviews, 'weeklyReviews', ['weekStart'], errors)

  await merge(db.categories as never, categories, (r) => r.id!, 'categories')
  await merge(db.activities as never, activities, (r) => r.id!, 'activities')
  await merge(db.dayRecords as never, dayRecords, (r) => r.date!, 'dayRecords')
  await merge(db.projects as never, projects, (r) => r.id!, 'projects')
  await merge(db.milestones as never, milestones, (r) => r.id!, 'milestones')
  await merge(db.weeklyReviews as never, reviews, (r) => r.weekStart!, 'weeklyReviews')

  if (isObj(raw.prefs)) {
    const prefs = raw.prefs as Partial<Prefs>
    if (prefs.theme === 'dark' || prefs.theme === 'light') {
      await db.meta.put({ key: 'prefs.theme', value: prefs.theme })
    }
    if (prefs.lang === 'ar' || prefs.lang === 'en') {
      await db.meta.put({ key: 'prefs.lang', value: prefs.lang })
    }
    if (typeof prefs.activeDayMinutes === 'number') {
      await db.meta.put({ key: 'prefs.activeDayMinutes', value: prefs.activeDayMinutes })
    }
    if (isObj(prefs.weeklyTargets)) {
      await db.meta.put({ key: 'prefs.weeklyTargets', value: prefs.weeklyTargets })
    }
  }
  return result
}
