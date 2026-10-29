// Critical-flow tests over real IndexedDB semantics via fake-indexeddb:
// create/edit daily records, persistence across a "reopen", and
// export/import merge with dedup and newer-updatedAt-wins.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, seedIfEmpty } from './db'
import { addActivity, setDayRecord, updateActivity } from './repo'
import { exportAll, importBundle } from './export'

beforeEach(async () => {
  await Promise.all([
    db.activities.clear(),
    db.dayRecords.clear(),
    db.categories.clear(),
    db.projects.clear(),
    db.milestones.clear(),
    db.weeklyReviews.clear(),
  ])
})

describe('persistence', () => {
  it('seeds categories and projects once, idempotently', async () => {
    await seedIfEmpty()
    await seedIfEmpty()
    expect(await db.categories.count()).toBe(6)
    expect(await db.projects.count()).toBe(6)
  })

  it('creates and edits daily records; they survive a reopen', async () => {
    const a = await addActivity({ date: '2026-10-29', categoryId: 'cat-english', kind: 'time', minutes: 60, completed: true })
    await updateActivity(a.id, { minutes: 90 })
    await db.close()
    // simulate page refresh: new connection to the same DB
    const { PccDBForTest } = await import('./db-test-helper')
    const db2 = new PccDBForTest()
    const got = await db2.activities.get(a.id)
    expect(got?.minutes).toBe(90)
    expect(got?.completed).toBe(true)
    await db2.close()
    await db.open() // reopen the shared singleton for later tests
  })

  it('stores day classification and reflection', async () => {
    await setDayRecord('2026-10-29', { classification: 'good', classificationSource: 'manual', reflection: 'يوم ممتاز' })
    const rec = await db.dayRecords.get('2026-10-29')
    expect(rec?.classification).toBe('good')
    expect(rec?.reflection).toBe('يوم ممتاز')
  })
})

describe('export/import', () => {
  it('round-trips the full database', async () => {
    await seedIfEmpty()
    const a = await addActivity({ date: '2026-10-29', categoryId: 'cat-english', kind: 'time', minutes: 45, completed: true })
    await setDayRecord('2026-10-29', { classification: 'good', classificationSource: 'manual' })
    const bundle = await exportAll()

    await db.activities.clear()
    await db.dayRecords.clear()
    const res = await importBundle(bundle)
    expect(res.errors).toEqual([])
    expect((await db.activities.get(a.id))?.minutes).toBe(45)
    expect((await db.dayRecords.get('2026-10-29'))?.classification).toBe('good')
  })

  it('dedupes by id and keeps the newer record', async () => {
    const a = await addActivity({ date: '2026-10-29', categoryId: 'cat-english', kind: 'time', minutes: 60, completed: true })
    const bundle = await exportAll()
    // local edit is newer than the export
    await new Promise((r) => setTimeout(r, 5))
    await updateActivity(a.id, { minutes: 120 })
    const res = await importBundle(bundle)
    expect(res.skipped).toBeGreaterThan(0)
    expect((await db.activities.get(a.id))?.minutes).toBe(120)
  })

  it('rejects invalid files with errors, not crashes', async () => {
    const r1 = await importBundle('not an object')
    expect(r1.errors.length).toBeGreaterThan(0)
    const r2 = await importBundle({ version: 99 })
    expect(r2.errors.length).toBeGreaterThan(0)
    const r3 = await importBundle({ version: 1, activities: [{ bogus: true }] })
    expect(r3.errors.length).toBeGreaterThan(0)
    expect(await db.activities.count()).toBe(0)
  })
})
