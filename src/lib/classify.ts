import { dayCompleted, dayMinutes } from './stats'
import type { Activity, Category, DayClass, ISODate } from './types'

export interface ClassifyRules {
  /** minutes needed for an 'acceptable' day */
  acceptableMinutes: number
  /** minutes needed for a 'good' day */
  goodMinutes: number
  /** minutes needed for an 'exceptional' day */
  exceptionalMinutes: number
  /** completed entries in enabled categories that count as "essentials" */
  essentialsForGood: number
}

export const DEFAULT_RULES: ClassifyRules = {
  acceptableMinutes: 30,
  goodMinutes: 120,
  exceptionalMinutes: 240,
  essentialsForGood: 2,
}

/**
 * Suggest a day classification. Deliberately NOT based on task count alone:
 * minutes of focused work AND completed essentials both contribute, so
 * "two essential tasks done well" can still be a good day.
 * The user can always override manually — this is only a suggestion.
 */
export function suggestClassification(
  activities: Activity[],
  categories: Category[],
  date: ISODate,
  rules: ClassifyRules = DEFAULT_RULES,
): DayClass {
  const enabled = new Set(categories.filter((c) => c.enabled).map((c) => c.id))
  const minutes = dayMinutes(activities.filter((a) => enabled.has(a.categoryId)), date)
  const essentials = activities.filter(
    (a) => a.date === date && a.completed && enabled.has(a.categoryId),
  ).length

  if (minutes >= rules.exceptionalMinutes || (minutes >= rules.goodMinutes && essentials >= rules.essentialsForGood + 1)) {
    return 'exceptional'
  }
  if (minutes >= rules.goodMinutes || essentials >= rules.essentialsForGood) return 'good'
  if (minutes >= rules.acceptableMinutes || essentials >= 1) return 'acceptable'
  return 'difficult'
}
