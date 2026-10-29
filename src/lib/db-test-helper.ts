// Helper for tests only: a second Dexie connection to the same database,
// used to simulate a page reload (fresh open of the same persisted DB).
import Dexie, { type Table } from 'dexie'
import type { Activity, Category, DayRecord, Milestone, Project, WeeklyReview } from './types'

export class PccDBForTest extends Dexie {
  categories!: Table<Category, string>
  activities!: Table<Activity, string>
  dayRecords!: Table<DayRecord, string>
  projects!: Table<Project, string>
  milestones!: Table<Milestone, string>
  weeklyReviews!: Table<WeeklyReview, string>

  constructor() {
    super('personal-command-center')
    this.version(1).stores({
      categories: 'id, key, order',
      activities: 'id, date, categoryId, projectId, [date+categoryId]',
      dayRecords: 'date',
      projects: 'id, status, priority',
      milestones: 'id, projectId, order',
      weeklyReviews: 'weekStart',
    })
  }
}
