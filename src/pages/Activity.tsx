import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDaysISO, diffDaysISO, formatMinutes, fromISO, todayISO, weekStartISO } from '@/lib/dates'
import { useActivities, useCategories, useDayRecords, usePrefs } from '@/lib/hooks'
import type { Activity, ISODate } from '@/lib/types'
import { DAY_CLASS_COLORS, DAY_CLASS_KEYS, useI18n } from '@/lib/i18n'
import { Badge, Button, Card, CardTitle, Segmented } from '@/components/ui'
import { cn } from '@/lib/utils'

const WEEKS = 26 // ~6 months

type CellState = 'none' | 'zero' | 'l1' | 'l2' | 'l3' | 'l4'
const cellColor: Record<CellState, string> = {
  none: 'var(--heat-0)',
  zero: 'transparent',
  l1: 'var(--heat-1)',
  l2: 'var(--heat-2)',
  l3: 'var(--heat-3)',
  l4: 'var(--heat-4)',
}

function intensity(minutes: number, hasRecord: boolean, hasData: boolean): CellState {
  if (!hasRecord && !hasData) return 'none'
  if (minutes <= 0 && !hasData) return 'zero'
  if (minutes <= 0) return 'l1'
  if (minutes < 60) return 'l1'
  if (minutes < 120) return 'l2'
  if (minutes < 240) return 'l3'
  return 'l4'
}

export default function ActivityPage() {
  const { t, lang } = useI18n()
  const activities = useActivities()
  const dayRecords = useDayRecords()
  const categories = useCategories()
  const prefs = usePrefs()
  const [selected, setSelected] = useState<ISODate | null>(null)

  const today = todayISO()
  const endWeekStart = weekStartISO(today)
  const startWeekStart = addDaysISO(endWeekStart, -(WEEKS - 1) * 7)

  const { byDate, hasRecordSet } = useMemo(() => {
    const byDate = new Map<ISODate, { minutes: number; entries: Activity[] }>()
    for (const a of activities) {
      const cur = byDate.get(a.date) ?? { minutes: 0, entries: [] }
      cur.minutes += a.minutes ?? 0
      cur.entries.push(a)
      byDate.set(a.date, cur)
    }
    const hasRecordSet = new Set(dayRecords.map((d) => d.date))
    return { byDate, hasRecordSet }
  }, [activities, dayRecords])

  const recByDate = useMemo(() => new Map(dayRecords.map((d) => [d.date, d])), [dayRecords])

  // weeks: array of 7-day arrays, Mon..Sun
  const weeks = useMemo(() => {
    const out: ISODate[][] = []
    for (let w = 0; w < WEEKS; w++) {
      const ws = addDaysISO(startWeekStart, w * 7)
      const days = Array.from({ length: 7 }, (_, i) => addDaysISO(ws, i))
      out.push(days)
    }
    return out
  }, [startWeekStart])

  const weekly = useMemo(
    () =>
      weeks.map((days) =>
        days.reduce((s, d) => s + (byDate.get(d)?.minutes ?? 0), 0),
      ),
    [weeks, byDate],
  )

  const monthly = useMemo(() => {
    const map = new Map<string, number>()
    for (const [date, v] of byDate) {
      if (date >= startWeekStart && date <= today) {
        const k = date.slice(0, 7)
        map.set(k, (map.get(k) ?? 0) + v.minutes)
      }
    }
    return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1))
  }, [byDate, startWeekStart, today])

  const selData = selected ? byDate.get(selected) : undefined
  const selRec = selected ? recByDate.get(selected) : undefined
  const catName = (id: string) => {
    const c = categories.find((x) => x.id === id)
    return c ? (lang === 'ar' ? c.labelAr : c.labelEn) : ''
  }

  const monthLabel = (d: ISODate) => {
    const dt = fromISO(d)
    return dt.toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { month: 'short' })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t('activity')}</h1>
        <p className="text-xs muted">
          {t('last30')} – {t('lastYear')}
        </p>
      </div>

      <Card className="overflow-x-auto">
        {/* month labels */}
        <div className="flex gap-[3px] mb-1 ps-6 min-w-max">
          {weeks.map((days, i) => {
            const prev = i > 0 ? weeks[i - 1][0] : ''
            const show = days[0].slice(0, 7) !== prev.slice(0, 7)
            return (
              <div key={days[0]} className="w-[15px] text-[9px] text-[var(--text-3)] overflow-visible">
                {show ? monthLabel(days[0]) : ''}
              </div>
            )
          })}
        </div>
        <div className="flex min-w-max">
          {/* day-of-week labels */}
          <div className="flex flex-col gap-[3px] me-1.5 text-[9px] text-[var(--text-3)]">
            {['S', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="h-[15px] leading-[15px] w-4">
                {[0, 2, 4].includes(i) ? d : ''}
              </div>
            ))}
          </div>
          {weeks.map((days) => (
            <div key={days[0]} className="flex flex-col gap-[3px] me-[3px]">
              {days.map((d) => {
                const v = byDate.get(d)
                const hasData = !!v && (v.minutes > 0 || v.entries.length > 0)
                const hasRecord = hasRecordSet.has(d)
                const state = intensity(v?.minutes ?? 0, hasRecord, hasData)
                const future = d > today
                return (
                  <button
                    key={d}
                    disabled={future}
                    onClick={() => setSelected(d === selected ? null : d)}
                    title={`${d} · ${formatMinutes(v?.minutes ?? 0)}`}
                    className={cn(
                      'w-[15px] h-[15px] rounded-[3px] transition-transform cursor-pointer hover:scale-110 disabled:opacity-30 disabled:cursor-default border',
                      selected === d && 'ring-2 ring-[var(--accent)]',
                    )}
                    style={{
                      background: cellColor[state],
                      borderColor: state === 'zero' ? 'var(--border)' : 'transparent',
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* legend */}
        <div className="flex items-center gap-1.5 mt-3 text-[10px] text-[var(--text-3)]">
          <span>{t('legend')}:</span>
          <span>{t('less')}</span>
          {(['none', 'l1', 'l2', 'l3', 'l4'] as CellState[]).map((s) => (
            <span key={s} className="w-3 h-3 rounded-[2px]" style={{ background: cellColor[s] }} />
          ))}
          <span>{t('more')}</span>
          <span className="mx-2">·</span>
          <span className="w-3 h-3 rounded-[2px] border border-[var(--border)]" />
          <span>{t('noRecord')}</span>
        </div>
      </Card>

      {/* selected day detail */}
      {selected && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="tabular">{selected}</CardTitle>
            <div className="flex items-center gap-2">
              {selRec?.classification && (
                <Badge color={DAY_CLASS_COLORS[selRec.classification]}>
                  {t(DAY_CLASS_KEYS[selRec.classification])}
                </Badge>
              )}
              <Link to={`/day/${selected}`} className="text-[11px] text-[var(--blue)] hover:underline">
                {t('edit')}
              </Link>
            </div>
          </div>
          {!selData || selData.entries.length === 0 ? (
            <p className="text-xs text-[var(--text-3)]">{t('noRecord')}</p>
          ) : (
            <ul className="divide-y divide-[var(--border-soft)]">
              {selData.entries.map((a) => (
                <li key={a.id} className="flex items-center gap-2 py-1.5 text-sm">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: categories.find((c) => c.id === a.categoryId)?.color }}
                  />
                  <span className="flex-1 truncate">{a.note || catName(a.categoryId)}</span>
                  {a.minutes != null && a.minutes > 0 && (
                    <span className="text-xs tabular muted">{formatMinutes(a.minutes)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {selRec?.reflection && (
            <p className="mt-2 pt-2 border-t border-[var(--border-soft)] text-xs text-[var(--text-2)] whitespace-pre-wrap">
              {selRec.reflection}
            </p>
          )}
        </Card>
      )}

      {/* summaries */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardTitle className="mb-3">{t('weeklySummary')}</CardTitle>
          <div className="flex items-end gap-[3px] h-20" dir="ltr">
            {weekly.slice(-16).map((m, i) => {
              const max = Math.max(60, ...weekly)
              return (
                <div key={i} className="flex-1 flex flex-col justify-end" title={formatMinutes(m)}>
                  <div
                    className="rounded-t-sm bg-[var(--accent)]/70"
                    style={{ height: `${Math.max(3, (m / max) * 100)}%` }}
                  />
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-[10px] text-[var(--text-3)]">{t('focusedMinutes')} · {t('weekly')}</p>
        </Card>
        <Card>
          <CardTitle className="mb-3">{t('monthly')}</CardTitle>
          {monthly.length === 0 ? (
            <p className="text-xs text-[var(--text-3)]">{t('noData')}</p>
          ) : (
            <ul className="space-y-1.5">
              {monthly.map(([m, mins]) => (
                <li key={m} className="flex items-center justify-between text-sm">
                  <span className="tabular muted">{m}</span>
                  <span className="tabular font-medium">{formatMinutes(mins)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
