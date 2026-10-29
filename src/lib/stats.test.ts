import { describe, expect, it } from 'vitest'
import {
  activeDaysInRange,
  bucketSeries,
  completionRate,
  consistencyIndex,
  currentStreak,
  dailySeries,
  dayCompleted,
  dayMinutes,
  QUALITY_SCORE,
} from './stats'
import type { Activity, DayClass } from './types'

const act = (date: string, minutes = 0, completed = false, categoryId = 'cat-english'): Activity => ({
  id: `${date}-${minutes}-${completed}-${Math.random()}`,
  date,
  categoryId,
  kind: 'time',
  minutes,
  completed,
  createdAt: 0,
  updatedAt: 0,
})

describe('measurable stats', () => {
  it('sums daily minutes and completed count', () => {
    const acts = [act('2026-10-29', 60, true), act('2026-10-29', 30, false), act('2026-10-28', 120, true)]
    expect(dayMinutes(acts, '2026-10-29')).toBe(90)
    expect(dayCompleted(acts, '2026-10-29')).toBe(1)
  })

  it('computes active days in range', () => {
    const acts = [act('2026-10-26', 45, true), act('2026-10-27', 0, true), act('2026-10-28', 10, false)]
    // activeDayMinutes=30: 26th (45m) active, 27th (completed) active, 28th not
    expect(activeDaysInRange(acts, '2026-10-26', '2026-10-28', 30)).toBe(2)
  })

  it('computes current streak ending yesterday when today empty', () => {
    const acts = [
      act('2026-10-26', 60, true),
      act('2026-10-27', 60, true),
      act('2026-10-28', 60, true),
    ]
    expect(currentStreak(acts, 30, '2026-10-29')).toBe(3)
    // gap breaks streak
    const withGap = [act('2026-10-26', 60, true), act('2026-10-28', 60, true)]
    expect(currentStreak(withGap, 30, '2026-10-29')).toBe(1)
  })

  it('completionRate divides completed by total', () => {
    const acts = [act('2026-10-26', 0, true), act('2026-10-27', 0, false), act('2026-10-28', 0, true), act('2026-10-28', 0, true)]
    expect(completionRate(acts, '2026-10-26', '2026-10-28')).toBe(75)
    expect(completionRate([], '2026-10-26', '2026-10-28')).toBe(0)
  })
})

describe('computed indices', () => {
  it('consistencyIndex = activeDays/days*100', () => {
    const acts = [act('2026-10-26', 60, true), act('2026-10-28', 60, true)]
    // 3-day range, 2 active days
    expect(consistencyIndex(acts, '2026-10-26', '2026-10-28', 30, '2026-10-28')).toBe(67)
  })

  it('dailySeries produces per-day values', () => {
    const acts = [act('2026-10-26', 90, true), act('2026-10-28', 30, true)]
    const s = dailySeries('minutes', acts, new Map(), '2026-10-26', '2026-10-28', 30)
    expect(s).toEqual([
      { date: '2026-10-26', value: 90 },
      { date: '2026-10-27', value: 0 },
      { date: '2026-10-28', value: 30 },
    ])
  })

  it('quality series maps classification to 1-4', () => {
    const classes = new Map<string, DayClass>([
      ['2026-10-26', 'exceptional'],
      ['2026-10-27', 'difficult'],
    ])
    const s = dailySeries('quality', [], classes, '2026-10-26', '2026-10-27', 30)
    expect(s[0].value).toBe(QUALITY_SCORE.exceptional)
    expect(s[1].value).toBe(QUALITY_SCORE.difficult)
  })

  it('bucketSeries sums minutes per week and averages quality', () => {
    const s = [
      { date: '2026-10-26', value: 60 }, // Monday
      { date: '2026-10-27', value: 60 },
      { date: '2026-11-02', value: 30 }, // next Monday
    ]
    const weekly = bucketSeries(s, 'week')
    expect(weekly).toEqual([
      { date: '2026-10-26', value: 120 },
      { date: '2026-11-02', value: 30 },
    ])
    const avg = bucketSeries(s, 'week', true)
    expect(avg[0].value).toBe(60)
  })
})
