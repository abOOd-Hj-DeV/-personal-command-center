import { useLiveQuery } from 'dexie-react-hooks'
import { db, getAllPrefs, DEFAULT_PREFS } from './db'
import type { ISODate, Prefs } from './types'

export function useCategories() {
  return useLiveQuery(() => db.categories.orderBy('order').toArray(), []) ?? []
}

export function useActivities(start?: ISODate, end?: ISODate) {
  return (
    useLiveQuery(() => {
      if (start && end) return db.activities.where('date').between(start, end, true, true).toArray()
      return db.activities.toArray()
    }, [start, end]) ?? []
  )
}

export function useDayRecords() {
  return useLiveQuery(() => db.dayRecords.toArray(), []) ?? []
}

export function useDayRecord(date: ISODate) {
  return useLiveQuery(() => db.dayRecords.get(date), [date])
}

export function useProjects() {
  return useLiveQuery(() => db.projects.toArray(), []) ?? []
}

export function useMilestones() {
  return useLiveQuery(() => db.milestones.toArray(), []) ?? []
}

export function useWeeklyReviews() {
  return useLiveQuery(() => db.weeklyReviews.toArray(), []) ?? []
}

export function usePrefs(): Prefs {
  return useLiveQuery(() => getAllPrefs(), []) ?? DEFAULT_PREFS
}
