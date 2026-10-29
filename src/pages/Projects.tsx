import { useMemo, useState } from 'react'
import { CheckCircle2, Circle, FolderKanban, Plus, Trash2 } from 'lucide-react'
import { formatMinutes, todayISO, weekStartISO } from '@/lib/dates'
import { useActivities, useCategories, useMilestones, useProjects, useWeeklyReviews } from '@/lib/hooks'
import {
  addMilestone,
  addProject,
  deleteMilestone,
  setWeeklyReview,
  updateMilestone,
  updateProject,
} from '@/lib/repo'
import { useI18n } from '@/lib/i18n'
import type { ProjectStatus } from '@/lib/types'
import { Badge, Button, Card, CardTitle, Input, Select, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'

const STATUS_KEYS: Record<ProjectStatus, string> = {
  active: 'active',
  paused: 'paused',
  done: 'doneStatus',
  archived: 'archived',
}
const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: 'var(--accent)',
  paused: 'var(--amber)',
  done: 'var(--blue)',
  archived: 'var(--text-3)',
}
const PRIORITY_LABELS: Record<number, string> = { 1: 'P1', 2: 'P2', 3: 'P3' }

export default function Projects() {
  const { t, lang } = useI18n()
  const projects = useProjects()
  const milestones = useMilestones()
  const activities = useActivities()
  const reviews = useWeeklyReviews()
  const categories = useCategories()

  const [newTitle, setNewTitle] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [milestoneText, setMilestoneText] = useState('')
  const [reviewEdit, setReviewEdit] = useState(false)
  const [review, setReview] = useState({ movedForward: '', stalled: '', timeSpent: '', mostImportantNext: '' })

  const weekStart = weekStartISO(todayISO())
  const currentReview = reviews.find((r) => r.weekStart === weekStart)

  const minutesByProject = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of activities) {
      if (a.projectId && a.minutes) map.set(a.projectId, (map.get(a.projectId) ?? 0) + a.minutes)
    }
    return map
  }, [activities])

  const weekMinutesByProject = useMemo(() => {
    const end = todayISO()
    const map = new Map<string, number>()
    for (const a of activities) {
      if (a.projectId && a.minutes && a.date >= weekStart && a.date <= end)
        map.set(a.projectId, (map.get(a.projectId) ?? 0) + a.minutes)
    }
    return map
  }, [activities, weekStart])

  const topTimeProject = useMemo(() => {
    let best: [string, number] | undefined
    for (const e of weekMinutesByProject) if (!best || e[1] > best[1]) best = e
    return best ? projects.find((p) => p.id === best![0]) : undefined
  }, [weekMinutesByProject, projects])

  const doneMilestonesThisWeek = useMemo(
    () =>
      milestones.filter(
        (m) => m.done && m.doneAt && m.doneAt >= Date.now() - 7 * 86400000,
      ),
    [milestones],
  )

  const active = projects.filter((p) => p.status === 'active')
  const others = projects.filter((p) => p.status !== 'active')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t('projects')}</h1>
          <p className="text-xs muted">{active.length} {t('active')}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder={t('addProject')}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newTitle.trim()) {
              void addProject({ title: newTitle.trim() })
              setNewTitle('')
            }
          }}
        />
        <Button
          variant="primary"
          onClick={() => {
            if (newTitle.trim()) {
              void addProject({ title: newTitle.trim() })
              setNewTitle('')
            }
          }}
        >
          <Plus size={15} />
        </Button>
      </div>

      {[...active, ...others].map((p) => {
        const ms = milestones.filter((m) => m.projectId === p.id).sort((a, b) => a.order - b.order)
        const done = ms.filter((m) => m.done).length
        const open = expanded === p.id
        return (
          <Card key={p.id} className="!p-4">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => { setExpanded(open ? null : p.id); setMilestoneText('') }}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  'bg-[var(--surface-2)]',
                )}
              >
                <FolderKanban size={16} className="text-[var(--text-2)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{p.title}</p>
                <p className="text-[11px] text-[var(--text-3)]">
                  {ms.length > 0 ? `${done}/${ms.length} ${t('milestones')} · ` : ''}
                  {formatMinutes(minutesByProject.get(p.id) ?? 0)} {t('timeInvested')}
                </p>
              </div>
              <Badge color={STATUS_COLORS[p.status]}>{t(STATUS_KEYS[p.status] as never)}</Badge>
              <Badge>{PRIORITY_LABELS[p.priority]}</Badge>
            </div>

            {open && (
              <div className="mt-4 pt-3 border-t border-[var(--border-soft)] space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={p.status}
                    onChange={(e) => updateProject(p.id, { status: e.target.value as ProjectStatus })}
                  >
                    {(Object.keys(STATUS_KEYS) as ProjectStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {t(STATUS_KEYS[s] as never)}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={String(p.priority)}
                    onChange={(e) => updateProject(p.id, { priority: Number(e.target.value) as 1 | 2 | 3 })}
                  >
                    {[1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {t('priority')} {n}
                      </option>
                    ))}
                  </Select>
                </div>
                <Input
                  placeholder={t('nextAction')}
                  defaultValue={p.nextAction ?? ''}
                  onBlur={(e) => updateProject(p.id, { nextAction: e.target.value })}
                />
                <Textarea
                  placeholder={t('notes')}
                  defaultValue={p.notes ?? ''}
                  onBlur={(e) => updateProject(p.id, { notes: e.target.value })}
                />
                <div>
                  <p className="text-xs font-medium muted mb-1.5">{t('milestones')}</p>
                  <ul className="space-y-1.5">
                    {ms.map((m) => (
                      <li key={m.id} className="flex items-center gap-2 text-sm">
                        <button
                          onClick={() => updateMilestone(m.id, { done: !m.done })}
                          className="cursor-pointer text-[var(--text-3)] hover:text-[var(--accent)]"
                        >
                          {m.done ? (
                            <CheckCircle2 size={16} className="text-[var(--accent)]" />
                          ) : (
                            <Circle size={16} />
                          )}
                        </button>
                        <span className={cn('flex-1', m.done && 'line-through text-[var(--text-3)]')}>
                          {m.title}
                        </span>
                        <button
                          onClick={() => deleteMilestone(m.id)}
                          className="text-[var(--text-3)] hover:text-[var(--danger)] cursor-pointer"
                          aria-label={t('delete')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder={t('addMilestone')}
                      value={milestoneText}
                      onChange={(e) => setMilestoneText(e.target.value)}
                      className="!h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (milestoneText.trim()) {
                          void addMilestone(p.id, milestoneText.trim())
                          setMilestoneText('')
                        }
                      }}
                    >
                      <Plus size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )
      })}

      {/* Weekly review */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <CardTitle>{t('weeklyReview')} · <span className="tabular text-[var(--text-3)]">{weekStart}</span></CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setReview({
                movedForward: currentReview?.movedForward ?? '',
                stalled: currentReview?.stalled ?? '',
                timeSpent: currentReview?.timeSpent ?? '',
                mostImportantNext: currentReview?.mostImportantNext ?? '',
              })
              setReviewEdit((v) => !v)
            }}
          >
            {reviewEdit ? t('cancel') : t('edit')}
          </Button>
        </div>

        {/* auto hints */}
        <div className="rounded-lg bg-[var(--surface-2)]/50 p-3 mb-3 space-y-1 text-xs text-[var(--text-2)]">
          <p>
            · {doneMilestonesThisWeek.length} {t('milestones')} ✓
            {topTimeProject && ` · ${t('timeSpentQ')} → ${topTimeProject.title}`}
          </p>
        </div>

        {reviewEdit ? (
          <div className="space-y-2">
            {(
              [
                ['movedForward', t('movedForward')],
                ['stalled', t('stalled')],
                ['timeSpent', t('timeSpentQ')],
                ['mostImportantNext', t('nextMostImportant')],
              ] as const
            ).map(([k, label]) => (
              <div key={k}>
                <p className="text-xs muted mb-1">{label}</p>
                <Input
                  value={review[k]}
                  onChange={(e) => setReview({ ...review, [k]: e.target.value })}
                />
              </div>
            ))}
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="primary"
                onClick={async () => {
                  await setWeeklyReview(weekStart, review)
                  setReviewEdit(false)
                }}
              >
                {t('save')}
              </Button>
            </div>
          </div>
        ) : currentReview ? (
          <dl className="space-y-2 text-sm">
            {currentReview.movedForward && (
              <div><dt className="text-xs muted">{t('movedForward')}</dt><dd>{currentReview.movedForward}</dd></div>
            )}
            {currentReview.stalled && (
              <div><dt className="text-xs muted">{t('stalled')}</dt><dd>{currentReview.stalled}</dd></div>
            )}
            {currentReview.timeSpent && (
              <div><dt className="text-xs muted">{t('timeSpentQ')}</dt><dd>{currentReview.timeSpent}</dd></div>
            )}
            {currentReview.mostImportantNext && (
              <div><dt className="text-xs muted">{t('nextMostImportant')}</dt><dd className="text-[var(--accent)]">{currentReview.mostImportantNext}</dd></div>
            )}
          </dl>
        ) : (
          <p className="text-xs text-[var(--text-3)]">{t('noData')}</p>
        )}
      </Card>
    </div>
  )
}
