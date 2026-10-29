import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Activity, BarChart3, CalendarCheck2, FolderKanban, LayoutDashboard, Moon, Plus, Settings, Sun } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { todayISO } from '@/lib/dates'

const NAV = [
  { to: '/', icon: LayoutDashboard, key: 'dashboard' as const },
  { to: '/day', icon: CalendarCheck2, key: 'tracking' as const },
  { to: '/progress', icon: BarChart3, key: 'progress' as const },
  { to: '/activity', icon: Activity, key: 'activity' as const },
  { to: '/projects', icon: FolderKanban, key: 'projects' as const },
  { to: '/settings', icon: Settings, key: 'settings' as const },
]

export default function Layout() {
  const { t } = useI18n()
  const { theme, setTheme } = useTheme()
  const nav = useNavigate()

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 h-10 text-sm font-medium transition-colors',
      isActive
        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
        : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]',
    )

  return (
    <div className="min-h-dvh flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-e border-[var(--border-soft)] bg-[var(--bg-soft)] p-4 sticky top-0 h-dvh">
        <div className="flex items-center gap-2.5 px-2 pb-5 pt-1">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center">
            <LayoutDashboard size={17} className="text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">{t('appName')}</p>
            <p className="text-[10px] text-[var(--text-3)]">{t('offlineReady')}</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={linkCls}>
              <n.icon size={17} />
              {t(n.key)}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-soft)]">
          <Button variant="primary" size="sm" onClick={() => nav(`/day/${todayISO()}?add=1`)}>
            <Plus size={14} /> {t('quickAdd')}
          </Button>
          <Button
            size="sm"
            aria-label="theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-13 border-b border-[var(--border-soft)] bg-[var(--bg)]/90 backdrop-blur">
          <p className="text-sm font-bold">{t('appName')}</p>
          <Button size="sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="theme">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </Button>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex justify-around border-t border-[var(--border-soft)] bg-[var(--bg)]/95 backdrop-blur px-1 pb-[env(safe-area-inset-bottom)]">
        {NAV.slice(0, 5).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 py-2 px-2 text-[10px] font-medium min-w-14',
                isActive ? 'text-[var(--accent)]' : 'text-[var(--text-3)]',
              )
            }
          >
            <n.icon size={19} />
            {t(n.key)}
          </NavLink>
        ))}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 py-2 px-2 text-[10px] font-medium min-w-14',
              isActive ? 'text-[var(--accent)]' : 'text-[var(--text-3)]',
            )
          }
        >
          <Settings size={19} />
          {t('settings')}
        </NavLink>
      </nav>
    </div>
  )
}
