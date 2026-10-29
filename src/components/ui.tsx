import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// ── Minimal design-system primitives (dark-first, CSS-var driven) ────

export function Card({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card p-4 sm:p-5', className)} {...p} />
}

export function CardTitle({ className, ...p }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-semibold text-[var(--text)] tracking-tight', className)} {...p} />
}

type BtnVariant = 'primary' | 'ghost' | 'outline' | 'danger'
const btnVariants: Record<BtnVariant, string> = {
  primary:
    'bg-[var(--accent)] text-[#06281c] dark:text-[#04251a] font-semibold hover:brightness-110',
  ghost: 'text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
  outline: 'border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text)] hover:border-[var(--text-3)]',
  danger: 'text-[var(--danger)] hover:bg-[rgba(248,113,113,0.1)]',
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' }
>(function Button({ className, variant = 'ghost', size = 'md', ...p }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none',
        size === 'sm' ? 'text-xs px-2.5 h-8' : 'text-sm px-3.5 h-9',
        btnVariants[variant],
        className,
      )}
      {...p}
    />
  )
})

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...p }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors',
          className,
        )}
        {...p}
      />
    )
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...p }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors resize-y min-h-16',
          className,
        )}
        {...p}
      />
    )
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...p }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors cursor-pointer',
          className,
        )}
        {...p}
      />
    )
  },
)

export function Badge({
  className,
  color,
  children,
}: {
  className?: string
  color?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', className)}
      style={
        color
          ? { color, background: `color-mix(in srgb, ${color} 14%, transparent)` }
          : { color: 'var(--text-2)', background: 'var(--surface-2)' }
      }
    >
      {children}
    </span>
  )
}

export function Progress({ value, max = 100, color, className }: { value: number; max?: number; color?: string; className?: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100))
  return (
    <div className={cn('h-2 rounded-full bg-[var(--surface-2)] overflow-hidden', className)}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: color ?? 'var(--accent)' }}
      />
    </div>
  )
}

/** Segmented control used for metric/period pickers. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: ReactNode; title?: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cn('inline-flex rounded-lg bg-[var(--surface-2)] border border-[var(--border-soft)] p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            'px-3 h-7 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap',
            value === o.value
              ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm border border-[var(--border-soft)]'
              : 'text-[var(--text-3)] hover:text-[var(--text-2)]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 cursor-pointer"
    >
      <span
        className={cn(
          'relative w-9 h-5 rounded-full transition-colors',
          checked ? 'bg-[var(--accent)]' : 'bg-[var(--border)]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
            checked ? 'start-4.5 ltr:left-4.5' : 'start-0.5',
          )}
          style={{ insetInlineStart: checked ? '18px' : '2px' }}
        />
      </span>
      {label && <span className="text-sm text-[var(--text-2)]">{label}</span>}
    </button>
  )
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      {icon && <div className="mb-3 text-[var(--text-3)]">{icon}</div>}
      <p className="text-sm font-medium text-[var(--text-2)]">{title}</p>
      {hint && <p className="mt-1 text-xs text-[var(--text-3)] max-w-xs">{hint}</p>}
    </div>
  )
}
