import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { addDaysISO, formatMinutes, todayISO } from '@/lib/dates'
import {
  useActivities,
  useCategories,
  useDayRecord,
  usePrefs,
  useProjects,
} from '@/lib/hooks'
import { addActivity, deleteActivity, setDayRecord, updateActivity } from '@/lib/repo'
import { dayCompleted, dayMinutes } from '@/lib/stats'
import { suggestClassification } from '@/lib/classify'
import { DAY_CLASS_COLORS, DAY_CLASS_KEYS, useI18n } from '@/lib/i18n'
import { Badge, Button, Card, CardTitle, Input, Select, Textarea } from '@/components/ui'
import type { DayClass, ISODate } from '@/lib/types'
import { cn } from '@/lib/utils'

const CLASSES: DayClass[] = ['difficult', 'acceptable', 'good', 'exceptional']

export default function Day() {
  const { date: param } = useParams()
  const [sp] = useSearchParams()
  const date = (param ?? todayISO()) as ISODate
  const nav = useNavigate()
  const { t, lang } = useI18n()
  const categories = useCategories()
  const projects = useProjects()
  const activities = useActivities(date, date)
  const rec = useDayRecord(date)
  const prefs = usePrefs()

  const [showForm, setShowForm] = useState(sp.get('add') === '1')
  const [catId, setCatId] = useState('')
  const [projId, setProjId] = useState('')
  const [mins, setMins] = useState('')
  const [note, setNote] = useState('')
  const [reflection, setReflection] = useState<string | undefined>(undefined)
  const [editingReflection, setEditingReflection] = useState(false)

  const minutes = useMemo(() => dayMinutes(activities, date), [activities, date])
  const completed = useMemo(() => dayCompleted(activities, date), [activities, date])
  const suggestion = useMemo(
    () => suggestClassification(activities, categories, date),
    [activities, categories, date],
  )
  const isToday = date === todayISO()

  const submit = async () => {
    const categoryId = catId || categories.find((c) => c.enabled)?.id
    if (!categoryId) return
    const minutes = parseInt(mins) || undefined
    await addActivity({
      date,
      categoryId,
      projectId: projId || undefined,
      kind: minutes ? 'time' : 'task',
      minutes,
      note: note || undefined,
      completed: !!minutes || true,
    })
    // auto-suggest classification when user hasn't manually set one
    if (rec?.classificationSource !== 'manual') {
      const fresh = await suggestClassification(
        await import('@/lib/db').then((m) => m.db.activities.where('date').equals(date).toArray()),
        categories,
        date,
      )
      await setDayRecord(date, { classification: fresh, classificationSource: 'auto' })
    }
    setShowForm(false)
    setMins('')
    setNote('')
  }

  const catLabel = (id: string) => {
    const c = categories.find((x) => x.id === id)
    return c ? (lang === 'ar' ? c.labelAr : c.labelEn) : ''
  }
  const catColor = (id: string) => categories.find((x) => x.id === id)?.color ?? 'var(--text-3)'

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <Button size="sm" onClick={() => nav(`/day/${addDaysISO(date, -1)}`)}>
          <ChevronRight size={16} className="rtl-flip" />
        </Button>
        <div className="text-center">
          <h1 className="text-lg font-bold tabular">{date}</h1>
          {isToday && <p className="text-xs text-[var(--accent)]">{t('today')}</p>}
        </div>
        <Button size="sm" onClick={() => nav(`/day/${addDaysISO(date, 1)}`)} disabled={date >= todayISO()}>
          <ChevronLeft size={16} />
        </Button>
      </div>

      {/* summary strip */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-2xl font-bold tabular text-[var(--accent)]">{formatMinutes(minutes)}</p>
          <p className="text-xs muted">{t('focusedToday')}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold tabular">{completed}</p>
          <p className="text-xs muted">{t('completedToday')}</p>
        </Card>
      </div>

      {/* classification */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <CardTitle>{t('dayQuality')}</CardTitle>
          {rec?.classificationSource === 'auto' && rec.classification && (
            <Badge color="var(--blue)">{t('suggested')}</Badge>
          )}
          {rec?.classificationSource === 'manual' && <Badge>{t('manualOverride')}</Badge>}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {CLASSES.map((c) => {
            const active = rec?.classification === c
            return (
              <button
                key={c}
                onClick={async () => {
                  await setDayRecord(date, {
                    classification: c,
                    classificationSource: 'manual',
                  })
                }}
                className={cn(
                  'rounded-lg border px-1 py-2.5 text-[11px] font-medium transition-all cursor-pointer',
                  active
                    ? 'border-transparent text-[#0b0f14]'
                    : 'border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-2)]',
                )}
                style={active ? { background: DAY_CLASS_COLORS[c] } : undefined}
              >
                {t(DAY_CLASS_KEYS[c])}
              </button>
            )
          })}
        </div>
        {(!rec || rec.classificationSource !== 'manual') && suggestion !== rec?.classification && (
          <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-3)]">
            <span>
              {t('suggested')}: {t(DAY_CLASS_KEYS[suggestion])}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setDayRecord(date, { classification: suggestion, classificationSource: 'auto' })
              }
            >
              {t('save')}
            </Button>
          </div>
        )}
      </Card>

      {/* entries */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <CardTitle>{t('tracking')}</CardTitle>
          <Button size="sm" variant="primary" onClick={() => setShowForm((v) => !v)}>
            <Plus size={14} /> {t('quickAdd')}
          </Button>
        </div>

        {showForm && (
          <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <Select value={catId} onChange={(e) => setCatId(e.target.value)}>
                <option value="">{t('categories')}</option>
                {categories
                  .filter((c) => c.enabled)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {lang === 'ar' ? c.labelAr : c.labelEn}
                    </option>
                  ))}
              </Select>
              <Select value={projId} onChange={(e) => setProjId(e.target.value)}>
                <option value="">{t('projects')}</option>
                {projects
                  .filter((p) => p.status === 'active')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder={t('minutes')}
                value={mins}
                onChange={(e) => setMins(e.target.value)}
              />
              <Input placeholder={t('note')} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" onClick={() => setShowForm(false)}>
                {t('cancel')}
              </Button>
              <Button size="sm" variant="primary" onClick={submit}>
                {t('save')}
              </Button>
            </div>
          </div>
        )}

        {activities.length === 0 ? (
          <p className="text-sm text-[var(--text-3)] text-center py-6">{t('emptyToday')}</p>
        ) : (
          <ul className="divide-y divide-[var(--border-soft)]">
            {activities.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <button
                  onClick={() => updateActivity(a.id, { completed: !a.completed })}
                  aria-label="toggle"
                  className={cn(
                    'w-5 h-5 shrink-0 rounded-md border-2 transition-colors cursor-pointer',
                    a.completed ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border)]',
                  )}
                  style={a.completed ? { borderColor: catColor(a.categoryId), background: catColor(a.categoryId) } : undefined}
                >
                  {a.completed && (
                    <svg viewBox="0 0 12 12" className="w-full h-full text-[#0b0f14]" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M2 6.5l2.5 2.5L10 3" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: catColor(a.categoryId) }} />
                    <span className="text-sm font-medium truncate">
                      {a.note || catLabel(a.categoryId)}
                    </span>
                    {a.note && (
                      <span className="text-[11px] text-[var(--text-3)]">{catLabel(a.categoryId)}</span>
                    )}
                  </div>
                </div>
                {a.minutes != null && a.minutes > 0 && (
                  <span className="text-xs tabular text-[var(--text-2)] shrink-0">
                    {formatMinutes(a.minutes)}
                  </span>
                )}
                <button
                  onClick={() => deleteActivity(a.id)}
                  className="text-[var(--text-3)] hover:text-[var(--danger)] cursor-pointer p-1"
                  aria-label={t('delete')}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* reflection */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <CardTitle>{t('reflection')}</CardTitle>
          {!editingReflection && (
            <Button size="sm" onClick={() => { setReflection(rec?.reflection ?? ''); setEditingReflection(true) }}>
              {t('edit')}
            </Button>
          )}
        </div>
        {editingReflection ? (
          <div className="space-y-2">
            <Textarea
              value={reflection ?? ''}
              onChange={(e) => setReflection(e.target.value)}
              placeholder={t('reflectionPlaceholder')}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => setEditingReflection(false)}>{t('cancel')}</Button>
              <Button
                size="sm"
                variant="primary"
                onClick={async () => {
                  await setDayRecord(date, { reflection: reflection ?? '' })
                  setEditingReflection(false)
                }}
              >
                {t('save')}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-2)] whitespace-pre-wrap">
            {rec?.reflection || <span className="text-[var(--text-3)]">{t('reflectionPlaceholder')}</span>}
          </p>
        )}
      </Card>
    </div>
  )
}
