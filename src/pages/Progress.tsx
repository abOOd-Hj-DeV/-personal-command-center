import { useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import { addDaysISO, diffDaysISO, todayISO } from '@/lib/dates'
import { useActivities, useCategories, useDayRecords, usePrefs } from '@/lib/hooks'
import { bucketSeries, dailySeries, type Bucket, type ChartMetric, type SeriesPoint } from '@/lib/stats'
import type { DayClass, ISODate } from '@/lib/types'
import { useI18n, type TKey } from '@/lib/i18n'
import { Badge, Card, CardTitle, EmptyState, Segmented, Select } from '@/components/ui'

type RangeKey = '30' | '90' | '365' | 'all'

const METRIC_DEFS: { key: ChartMetric | `cat:${string}`; label: TKey; computed: boolean }[] = [
  { key: 'minutes', label: 'focusedMinutes', computed: false },
  { key: 'tasks', label: 'completedTasks', computed: false },
  { key: 'consistency', label: 'consistency', computed: true },
  { key: 'quality', label: 'qualityScore', computed: true },
]

function firstDataDate(series: SeriesPoint[]): ISODate | undefined {
  return series.find((p) => p.value > 0)?.date
}

export default function Progress() {
  const { t, lang } = useI18n()
  const activities = useActivities()
  const categories = useCategories()
  const dayRecords = useDayRecords()
  const prefs = usePrefs()

  const [metric, setMetric] = useState<string>('minutes')
  const [bucket, setBucket] = useState<Bucket>('day')
  const [range, setRange] = useState<RangeKey>('90')
  const [compare, setCompare] = useState(false)

  const today = todayISO()
  const classes = useMemo(
    () => new Map(dayRecords.filter((d) => d.classification).map((d) => [d.date, d.classification!])),
    [dayRecords],
  )

  const isCatMetric = metric.startsWith('cat:')
  const baseMetric: ChartMetric = isCatMetric ? 'minutes' : (metric as ChartMetric)
  const catId = isCatMetric ? metric.slice(4) : undefined

  const earliest = useMemo(() => {
    if (activities.length === 0 && dayRecords.length === 0) return undefined
    const dates = [...activities.map((a) => a.date), ...dayRecords.map((d) => d.date)]
    return dates.sort()[0]
  }, [activities, dayRecords])

  const start: ISODate = useMemo(() => {
    if (range === 'all') return earliest ?? today
    return addDaysISO(today, -Number(range) + 1)
  }, [range, earliest, today])

  const span = diffDaysISO(start, today) + 1

  const rawSeries = useMemo(
    () => dailySeries(baseMetric, activities, classes, start, today, prefs.activeDayMinutes, catId),
    [baseMetric, activities, classes, start, today, prefs.activeDayMinutes, catId],
  )

  const series = useMemo(
    () => bucketSeries(rawSeries, bucket, baseMetric === 'quality' || baseMetric === 'consistency'),
    [rawSeries, bucket, baseMetric],
  )

  const prevSeries = useMemo(() => {
    if (!compare) return []
    const prevStart = addDaysISO(start, -span)
    const prevEnd = addDaysISO(start, -1)
    const raw = dailySeries(baseMetric, activities, classes, prevStart, prevEnd, prefs.activeDayMinutes, catId)
    const agg = bucketSeries(raw, bucket, baseMetric === 'quality' || baseMetric === 'consistency')
    // align by index onto current period dates
    return agg.map((p, i) => ({ date: series[i]?.date ?? p.date, prev: p.value }))
  }, [compare, start, span, baseMetric, activities, classes, bucket, prefs.activeDayMinutes, catId, series])

  const chartData = useMemo(() => {
    return series.map((p, i) => ({
      date: p.date,
      value: p.value,
      prev: compare ? prevSeries[i]?.prev : undefined,
    }))
  }, [series, prevSeries, compare])

  const hasData = series.some((p) => p.value > 0)
  const metricDef = METRIC_DEFS.find((m) => m.key === metric) ?? (isCatMetric ? { label: 'focusedMinutes' as TKey, computed: false } : METRIC_DEFS[0])

  const fmtX = (d: string) => (bucket === 'month' || bucket === 'year' ? d : d.slice(5))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t('progress')}</h1>
        <p className="text-xs muted">
          {t(metricDef.label)} ·{' '}
          <Badge className="!py-0" color={metricDef.computed ? 'var(--violet)' : 'var(--accent)'}>
            {t(metricDef.computed ? 'computedIndex' : 'measurable')}
          </Badge>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={bucket}
          onChange={setBucket}
          options={[
            { value: 'day' as Bucket, label: t('daily') },
            { value: 'week' as Bucket, label: t('weekly') },
            { value: 'month' as Bucket, label: t('monthly') },
            { value: 'year' as Bucket, label: t('yearly') },
          ]}
        />
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: '30' as RangeKey, label: t('last30') },
            { value: '90' as RangeKey, label: t('last90') },
            { value: '365' as RangeKey, label: t('lastYear') },
            { value: 'all' as RangeKey, label: t('allTime') },
          ]}
        />
        <Select value={metric} onChange={(e) => setMetric(e.target.value)}>
          {METRIC_DEFS.map((m) => (
            <option key={m.key} value={m.key}>
              {t(m.label)}
            </option>
          ))}
          <optgroup label={t('categories')}>
            {categories.map((c) => (
              <option key={c.id} value={`cat:${c.id}`}>
                {lang === 'ar' ? c.labelAr : c.labelEn}
              </option>
            ))}
          </optgroup>
        </Select>
        <label className="inline-flex items-center gap-1.5 text-xs text-[var(--text-2)] cursor-pointer">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          {t('comparePrevious')}
        </label>
      </div>

      <Card className="!p-3 sm:!p-5">
        {!hasData ? (
          <EmptyState title={t('emptyChart')} icon={<BarChart3 size={24} />} />
        ) : (
          <div className="h-72 sm:h-80" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillMain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtX}
                  tick={{ fill: 'var(--text-3)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-soft)' }}
                  minTickGap={28}
                />
                <YAxis
                  tick={{ fill: 'var(--text-3)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={baseMetric === 'quality' ? [0, 4] : baseMetric === 'consistency' ? [0, 100] : ['auto', 'auto']}
                  width={46}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'var(--text-2)', fontWeight: 600 }}
                  itemStyle={{ padding: 0 }}
                  formatter={(v: number, name: string) => [
                    baseMetric === 'minutes' ? `${v}m` : v,
                    name === 'prev' ? 'prev' : t(metricDef.label),
                  ]}
                  labelFormatter={(d: string) => (bucket === 'day' ? d : `${fmtX(d)}`)}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#fillMain)"
                  dot={{ r: 1.6, fill: 'var(--accent)', strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--bg)', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
                {compare && (
                  <Line
                    type="monotone"
                    dataKey="prev"
                    stroke="var(--blue)"
                    strokeWidth={1.4}
                    strokeDasharray="5 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <p className="text-[11px] text-[var(--text-3)] leading-relaxed">
        {metric === 'quality' ? t('qualityHint') : metric === 'consistency' ? t('consistencyHint') : ''}
      </p>
    </div>
  )
}
