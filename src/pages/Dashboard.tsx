import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Flame, Plus, TrendingUp } from 'lucide-react'
import { addDaysISO, formatMinutes, todayISO, weekStartISO } from '@/lib/dates'
import {
  useActivities,
  useCategories,
  useDayRecord,
  usePrefs,
  useProjects,
} from '@/lib/hooks'
import {
  completionRate,
  consistencyIndex,
  currentStreak,
  dayCompleted,
  dayMinutes,
  minutesByCategory,
} from '@/lib/stats'
import { DAY_CLASS_COLORS, DAY_CLASS_KEYS, useI18n } from '@/lib/i18n'
import { Button, Card, CardTitle, EmptyState, Progress, Badge } from '@/components/ui'

export default function Dashboard() {
  const { t, lang, dir } = useI18n()
  const nav = useNavigate()
  const today = todayISO()
  const weekStart = weekStartISO(today)
  const categories = useCategories()
  const activities = useActivities(weekStart, today)
  const rec = useDayRecord(today)
  const prefs = usePrefs()
  const projects = useProjects()
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight

  const stats = useMemo(() => {
    const weekMins = activities
      .filter((a) => a.minutes)
      .reduce((s, a) => s + (a.minutes ?? 0), 0)
    return {
      todayMinutes: dayMinutes(activities, today),
      todayCompleted: dayCompleted(activities, today),
      weekMinutes: weekMins,
      streak: currentStreak(activities, prefs.activeDayMinutes, today),
      consistency: consistencyIndex(activities, weekStart, today, prefs.activeDayMinutes, today),
      completion: completionRate(activities, weekStart, today),
      perCat: minutesByCategory(activities, weekStart, today),
    }
  }, [activities, today, weekStart, prefs])

  const todayEntries = activities.filter((a) => a.date === today)
  const catName = (id: string) => {
    const c = categories.find((x) => x.id === id)
    return c ? (lang === 'ar' ? c.labelAr : c.labelEn) : ''
  }

  const statCards = [
    { label: t('focusedToday'), value: formatMinutes(stats.todayMinutes), color: 'var(--accent)' },
    { label: t('weekMinutes'), value: formatMinutes(stats.weekMinutes), color: 'var(--blue)' },
    {
      label: t('streak'),
      value: String(stats.streak),
      color: 'var(--amber)',
      icon: <Flame size={15} className="text-[var(--amber)]" />,
    },
    { label: t('completionRate'), value: `${stats.completion}%`, color: 'var(--violet)' },
  ]

  const topProjects = projects.filter((p) => p.status === 'active' && p.priority === 1).slice(0, 3)

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t('dashboard')}</h1>
          <p className="text-xs muted tabular">{today}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => nav(`/day/${today}?add=1`)}>
          <Plus size={14} /> {t('quickAdd')}
        </Button>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="!p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] muted">{s.label}</p>
              {s.icon}
            </div>
            <p className="mt-1 text-2xl font-bold tabular" style={{ color: s.color }}>
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      {/* weekly targets */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <CardTitle>{t('weeklyProgress')}</CardTitle>
          <Link to="/settings" className="text-[11px] text-[var(--blue)] hover:underline">
            {t('targets')}
          </Link>
        </div>
        <div className="space-y-3">
          {categories
            .filter((c) => c.enabled && (prefs.weeklyTargets[c.id] ?? c.targetMinutesPerWeek ?? 0) > 0)
            .map((c) => {
              const target = prefs.weeklyTargets[c.id] ?? c.targetMinutesPerWeek ?? 0
              const got = stats.perCat.get(c.id) ?? 0
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                      {lang === 'ar' ? c.labelAr : c.labelEn}
                    </span>
                    <span className="tabular text-[var(--text-2)]">
                      {formatMinutes(got)} <span className="text-[var(--text-3)]">/ {formatMinutes(target)}</span>
                    </span>
                  </div>
                  <Progress value={got} max={target} color={c.color} />
                </div>
              )
            })}
          {categories.filter((c) => c.enabled && (prefs.weeklyTargets[c.id] ?? c.targetMinutesPerWeek ?? 0) > 0)
            .length === 0 && <p className="text-xs text-[var(--text-3)]">{t('noData')}</p>}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* today entries */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <CardTitle>{t('today')}</CardTitle>
            <Link to={`/day/${today}`} className="text-[11px] text-[var(--blue)] hover:underline inline-flex items-center gap-0.5">
              {t('tracking')} <Arrow size={11} />
            </Link>
          </div>
          {todayEntries.length === 0 ? (
            <EmptyState title={t('emptyToday')} icon={<Plus size={22} />} />
          ) : (
            <ul className="divide-y divide-[var(--border-soft)]">
              {todayEntries.map((a) => (
                <li key={a.id} className="flex items-center gap-2.5 py-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: categories.find((c) => c.id === a.categoryId)?.color }}
                  />
                  <span className="text-sm flex-1 truncate">{a.note || catName(a.categoryId)}</span>
                  {a.minutes != null && a.minutes > 0 && (
                    <span className="text-xs tabular muted">{formatMinutes(a.minutes)}</span>
                  )}
                  {a.completed && <span className="text-[var(--accent)] text-xs">✓</span>}
                </li>
              ))}
            </ul>
          )}
          {rec?.classification && (
            <div className="mt-3 pt-3 border-t border-[var(--border-soft)] flex items-center justify-between">
              <span className="text-xs muted">{t('dayQuality')}</span>
              <Badge color={DAY_CLASS_COLORS[rec.classification]}>{t(DAY_CLASS_KEYS[rec.classification])}</Badge>
            </div>
          )}
        </Card>

        {/* consistency + projects */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-1">
              <CardTitle>{t('consistency')}</CardTitle>
              <TrendingUp size={15} className="text-[var(--accent)]" />
            </div>
            <p className="text-3xl font-bold tabular text-[var(--accent)]">{stats.consistency}%</p>
            <p className="mt-1 text-[11px] text-[var(--text-3)] leading-relaxed">{t('consistencyHint')}</p>
            <Link to="/progress" className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--blue)] hover:underline">
              {t('progress')} <Arrow size={11} />
            </Link>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-2">
              <CardTitle>{t('projects')}</CardTitle>
              <Link to="/projects" className="text-[11px] text-[var(--blue)] hover:underline inline-flex items-center gap-0.5">
                {t('projects')} <Arrow size={11} />
              </Link>
            </div>
            {topProjects.length === 0 ? (
              <p className="text-xs text-[var(--text-3)]">{t('noData')}</p>
            ) : (
              <ul className="space-y-2">
                {topProjects.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                    <span className="text-sm flex-1 truncate">{p.title}</span>
                    {p.nextAction && (
                      <span className="text-[11px] text-[var(--text-3)] truncate max-w-40">
                        {p.nextAction}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
