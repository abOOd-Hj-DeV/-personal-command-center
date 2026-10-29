// ── Core domain types ────────────────────────────────────────────────
// Date fields are stored as 'YYYY-MM-DD' strings in the user's local
// timezone. All timestamps (updatedAt/createdAt) are epoch milliseconds.

export type ISODate = string // 'YYYY-MM-DD'

export type DayClass = 'difficult' | 'acceptable' | 'good' | 'exceptional'

export type ActivityKind = 'task' | 'time' | 'milestone' | 'note'

export interface Category {
  id: string
  /** stable key for built-ins, used by stats; custom categories get 'custom:<slug>' */
  key: string
  labelAr: string
  labelEn: string
  color: string
  icon?: string
  /** weekly focused-minutes target; 0/undefined = no target */
  targetMinutesPerWeek?: number
  enabled: boolean
  order: number
  updatedAt: number
}

export interface Activity {
  id: string
  date: ISODate
  categoryId: string
  projectId?: string
  kind: ActivityKind
  /** focused minutes, when the entry tracks time */
  minutes?: number
  completed: boolean
  note?: string
  createdAt: number
  updatedAt: number
}

export interface DayRecord {
  date: ISODate // primary key
  classification?: DayClass
  /** 'auto' = suggested by rules, 'manual' = user override */
  classificationSource?: 'auto' | 'manual'
  reflection?: string
  updatedAt: number
}

export type ProjectStatus = 'active' | 'paused' | 'done' | 'archived'

export interface Project {
  id: string
  title: string
  status: ProjectStatus
  priority: 1 | 2 | 3 // 1 = highest
  nextAction?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface Milestone {
  id: string
  projectId: string
  title: string
  done: boolean
  doneAt?: number
  targetDate?: ISODate
  order: number
  updatedAt: number
}

export type Prefs = {
  theme: 'dark' | 'light'
  lang: 'ar' | 'en'
  /** minutes that count as an "active day" for consistency metrics */
  activeDayMinutes: number
  /** weekly targets keyed by category key */
  weeklyTargets: Record<string, number>
}

/** A row of local state for the weekly review */
export interface WeeklyReview {
  weekStart: ISODate // primary key, Monday
  movedForward?: string
  stalled?: string
  timeSpent?: string
  mostImportantNext?: string
  updatedAt: number
}
