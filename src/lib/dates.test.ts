import { describe, expect, it } from 'vitest'
import { addDaysISO, diffDaysISO, fromISO, formatMinutes, isoRange, todayISO, toISO, weekStartISO } from './dates'

describe('dates', () => {
  it('round-trips ISO without timezone drift', () => {
    expect(toISO(fromISO('2026-01-15'))).toBe('2026-01-15')
    expect(toISO(fromISO('2026-12-31'))).toBe('2026-12-31')
  })
  it('adds days across month/year boundaries', () => {
    expect(addDaysISO('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDaysISO('2025-12-31', 1)).toBe('2026-01-01')
    expect(addDaysISO('2024-02-28', 1)).toBe('2024-02-29') // leap
  })
  it('computes Monday week start', () => {
    expect(weekStartISO('2026-10-29')).toBe('2026-10-26') // Thursday -> Monday
    expect(weekStartISO('2026-10-26')).toBe('2026-10-26') // already Monday
    expect(weekStartISO('2026-11-01')).toBe('2026-10-26') // Sunday -> prev Monday
  })
  it('diffDaysISO counts forward', () => {
    expect(diffDaysISO('2026-10-01', '2026-10-08')).toBe(7)
  })
  it('isoRange is inclusive', () => {
    expect(isoRange('2026-01-01', '2026-01-03')).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
    ])
  })
  it('formatMinutes', () => {
    expect(formatMinutes(0)).toBe('0')
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(60)).toBe('1h')
    expect(formatMinutes(95)).toBe('1h 35m')
  })
  it('todayISO returns a local YYYY-MM-DD', () => {
    expect(todayISO(new Date(2026, 9, 29))).toBe('2026-10-29')
  })
})
