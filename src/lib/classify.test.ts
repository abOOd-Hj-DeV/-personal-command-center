import { describe, expect, it } from 'vitest'
import { DEFAULT_RULES, suggestClassification } from './classify'
import type { Activity, Category } from './types'

const cat = (id: string, enabled = true): Category => ({
  id,
  key: id,
  labelAr: id,
  labelEn: id,
  color: '#fff',
  enabled,
  order: 1,
  updatedAt: 0,
})

const act = (minutes: number, completed: boolean, categoryId = 'c1'): Activity => ({
  id: Math.random().toString(36).slice(2),
  date: '2026-10-29',
  categoryId,
  kind: 'time',
  minutes,
  completed,
  createdAt: 0,
  updatedAt: 0,
})

const cats = [cat('c1'), cat('c2'), cat('off', false)]

describe('suggestClassification', () => {
  it('difficult day when nothing happened', () => {
    expect(suggestClassification([], cats, '2026-10-29')).toBe('difficult')
  })
  it('acceptable with small effort', () => {
    expect(suggestClassification([act(30, false)], cats, '2026-10-29')).toBe('acceptable')
    expect(suggestClassification([act(0, true)], cats, '2026-10-29')).toBe('acceptable')
  })
  it('good from minutes OR essentials (not task-count alone)', () => {
    expect(suggestClassification([act(120, true)], cats, '2026-10-29')).toBe('good')
    // two completed essentials but low minutes => good (quality over quantity)
    expect(suggestClassification([act(10, true), act(15, true)], cats, '2026-10-29')).toBe('good')
  })
  it('exceptional from deep focus', () => {
    expect(suggestClassification([act(240, true)], cats, '2026-10-29')).toBe('exceptional')
  })
  it('ignores disabled categories', () => {
    const acts = [{ ...act(300, true), categoryId: 'off' }]
    expect(suggestClassification(acts, cats, '2026-10-29')).toBe('difficult')
  })
  it('respects custom rules', () => {
    const rules = { ...DEFAULT_RULES, goodMinutes: 60 }
    expect(suggestClassification([act(90, true)], cats, '2026-10-29', rules)).toBe('good')
  })
})
