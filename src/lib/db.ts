import Dexie, { type Table } from 'dexie'
import type {
  Activity,
  Category,
  DayRecord,
  Milestone,
  Prefs,
  Project,
  WeeklyReview,
} from './types'

export interface MetaRow {
  key: string
  value: unknown
}

class PccDB extends Dexie {
  categories!: Table<Category, string>
  activities!: Table<Activity, string>
  dayRecords!: Table<DayRecord, string>
  projects!: Table<Project, string>
  milestones!: Table<Milestone, string>
  weeklyReviews!: Table<WeeklyReview, string>
  meta!: Table<MetaRow, string>

  constructor() {
    super('personal-command-center')
    this.version(1).stores({
      categories: 'id, key, order',
      activities: 'id, date, categoryId, projectId, [date+categoryId]',
      dayRecords: 'date',
      projects: 'id, status, priority',
      milestones: 'id, projectId, order',
      weeklyReviews: 'weekStart',
      meta: 'key',
    })
  }
}

export const db = new PccDB()

export const DEFAULT_PREFS: Prefs = {
  theme: 'dark',
  lang: 'ar',
  activeDayMinutes: 30,
  weeklyTargets: {},
}

export async function getPref<K extends keyof Prefs>(key: K): Promise<Prefs[K]> {
  const row = await db.meta.get(`prefs.${key}`)
  return (row?.value as Prefs[K]) ?? DEFAULT_PREFS[key]
}

export async function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  await db.meta.put({ key: `prefs.${key}`, value })
}

export async function getAllPrefs(): Promise<Prefs> {
  const rows = await db.meta.where('key').startsWith('prefs.').toArray()
  const prefs = { ...DEFAULT_PREFS }
  for (const r of rows) {
    const k = r.key.replace('prefs.', '') as keyof Prefs
    // @ts-expect-error dynamic key
    prefs[k] = r.value
  }
  return prefs
}

const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`)

export const newId = uid

export const BUILT_IN_CATEGORIES: Omit<Category, 'updatedAt'>[] = [
  { id: 'cat-english', key: 'english', labelAr: 'الإنجليزية / IELTS', labelEn: 'English / IELTS', color: '#38bdf8', targetMinutesPerWeek: 420, enabled: true, order: 1 },
  { id: 'cat-cents', key: 'cents', labelAr: 'الرياضيات / CEnT-S', labelEn: 'Math / CEnT-S', color: '#a78bfa', targetMinutesPerWeek: 420, enabled: true, order: 2 },
  { id: 'cat-project', key: 'project', labelAr: 'عمل المشاريع', labelEn: 'Project work', color: '#34d399', targetMinutesPerWeek: 600, enabled: true, order: 3 },
  { id: 'cat-tech', key: 'tech', labelAr: 'التعلم التقني / OSSU', labelEn: 'Technical learning / OSSU', color: '#fbbf24', targetMinutesPerWeek: 300, enabled: true, order: 4 },
  { id: 'cat-freelance', key: 'freelance', labelAr: 'العمل الحر', labelEn: 'Freelance work', color: '#f472b6', targetMinutesPerWeek: 0, enabled: true, order: 5 },
  { id: 'cat-personal', key: 'personal', labelAr: 'أنشطة شخصية', labelEn: 'Personal activities', color: '#94a3b8', targetMinutesPerWeek: 0, enabled: true, order: 6 },
]

export const BUILT_IN_PROJECTS: Omit<Project, 'createdAt' | 'updatedAt'>[] = [
  { id: 'proj-cents', title: 'القبول الجامعي و CEnT-S', status: 'active', priority: 1 },
  { id: 'proj-english', title: 'الإنجليزية / IELTS', status: 'active', priority: 1 },
  { id: 'proj-sakina', title: 'سكينة', status: 'active', priority: 2 },
  { id: 'proj-startup2', title: 'مشروعي الثاني واحتضانه', status: 'active', priority: 2 },
  { id: 'proj-freelance', title: 'تطوير العمل الحر', status: 'active', priority: 3 },
  { id: 'proj-ossu', title: 'أساسيات علوم الحاسوب / OSSU', status: 'active', priority: 2 },
]

export async function seedIfEmpty() {
  const count = await db.categories.count()
  const now = Date.now()
  if (count === 0) {
    await db.categories.bulkAdd(BUILT_IN_CATEGORIES.map((c) => ({ ...c, updatedAt: now })))
  }
  const pcount = await db.projects.count()
  if (pcount === 0) {
    await db.projects.bulkAdd(BUILT_IN_PROJECTS.map((p) => ({ ...p, createdAt: now, updatedAt: now })))
  }
  const milestones = await db.milestones.count()
  if (milestones === 0) {
    await db.milestones.bulkAdd([
      { id: newId(), projectId: 'proj-cents', title: 'التسجيل في اختبار CEnT-S', done: false, order: 1, updatedAt: now },
      { id: newId(), projectId: 'proj-cents', title: 'إنهاء مراجعة الرياضيات', done: false, order: 2, updatedAt: now },
      { id: newId(), projectId: 'proj-english', title: 'تحديد مستوى IELTS الحالي', done: false, order: 1, updatedAt: now },
      { id: newId(), projectId: 'proj-startup2', title: 'تقديم طلب الاحتضان', done: false, order: 1, updatedAt: now },
    ])
  }
}
