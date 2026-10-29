import { db, newId } from './db'
import type {
  Activity,
  Category,
  DayClass,
  DayRecord,
  ISODate,
  Milestone,
  Project,
  WeeklyReview,
} from './types'

// ── Write helpers. Every mutation stamps updatedAt. ──────────────────

export async function addActivity(
  input: Omit<Activity, 'id' | 'createdAt' | 'updatedAt' | 'completed'> & { completed?: boolean },
): Promise<Activity> {
  const now = Date.now()
  const a: Activity = { completed: false, ...input, id: newId(), createdAt: now, updatedAt: now }
  await db.activities.add(a)
  return a
}

export async function updateActivity(id: string, patch: Partial<Activity>) {
  await db.activities.update(id, { ...patch, updatedAt: Date.now() })
}

export async function deleteActivity(id: string) {
  await db.activities.delete(id)
}

export async function setDayRecord(
  date: ISODate,
  patch: Partial<Omit<DayRecord, 'date'>>,
): Promise<DayRecord> {
  const existing = await db.dayRecords.get(date)
  const rec: DayRecord = { ...(existing ?? { date }), ...patch, date, updatedAt: Date.now() }
  await db.dayRecords.put(rec)
  return rec
}

export async function setDayClassification(date: ISODate, cls: DayClass | undefined, source: 'auto' | 'manual') {
  return setDayRecord(date, { classification: cls, classificationSource: source })
}

export async function addCategory(input: { labelAr: string; labelEn: string; color: string; targetMinutesPerWeek?: number }) {
  const order = (await db.categories.count()) + 1
  const c: Category = {
    id: newId(),
    key: `custom:${input.labelEn.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'cat'}`,
    labelAr: input.labelAr,
    labelEn: input.labelEn,
    color: input.color,
    targetMinutesPerWeek: input.targetMinutesPerWeek ?? 0,
    enabled: true,
    order,
    updatedAt: Date.now(),
  }
  await db.categories.add(c)
  return c
}

export async function updateCategory(id: string, patch: Partial<Category>) {
  await db.categories.update(id, { ...patch, updatedAt: Date.now() })
}

export async function addProject(input: { title: string; priority?: 1 | 2 | 3 }) {
  const now = Date.now()
  const p: Project = {
    id: newId(),
    title: input.title,
    status: 'active',
    priority: input.priority ?? 2,
    createdAt: now,
    updatedAt: now,
  }
  await db.projects.add(p)
  return p
}

export async function updateProject(id: string, patch: Partial<Project>) {
  await db.projects.update(id, { ...patch, updatedAt: Date.now() })
}

export async function addMilestone(projectId: string, title: string) {
  const count = await db.milestones.where('projectId').equals(projectId).count()
  const m: Milestone = {
    id: newId(),
    projectId,
    title,
    done: false,
    order: count + 1,
    updatedAt: Date.now(),
  }
  await db.milestones.add(m)
  return m
}

export async function updateMilestone(id: string, patch: Partial<Milestone>) {
  const done = patch.done
  await db.milestones.update(id, {
    ...patch,
    doneAt: done === undefined ? patch.doneAt : done ? Date.now() : undefined,
    updatedAt: Date.now(),
  })
}

export async function deleteMilestone(id: string) {
  await db.milestones.delete(id)
}

export async function setWeeklyReview(weekStart: ISODate, patch: Partial<Omit<WeeklyReview, 'weekStart'>>) {
  const existing = await db.weeklyReviews.get(weekStart)
  const rec: WeeklyReview = { ...(existing ?? { weekStart }), ...patch, weekStart, updatedAt: Date.now() }
  await db.weeklyReviews.put(rec)
  return rec
}
