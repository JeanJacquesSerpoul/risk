import { motion } from 'motion/react'
import { X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'
import { useT } from '../i18n/useT'

/** Glass dialog over a dimmed backdrop; closes with Escape or a click outside. */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide,
  z = 'z-50',
}: {
  title: ReactNode
  subtitle?: ReactNode
  onClose?: () => void
  children: ReactNode
  wide?: boolean
  z?: string
}) {
  const { t } = useT()
  useEffect(() => {
    if (!onClose) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <motion.div
      className={`fixed inset-0 ${z} flex items-end justify-center bg-[var(--scrim)] p-2 backdrop-blur-sm sm:items-center sm:p-4`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        className={`glass flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-3xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}
        initial={{ y: 60, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
          <div className="min-w-0">
            <h2 className="font-display text-base font-black tracking-widest text-neon">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-fg/55">{subtitle}</p>}
          </div>
          {onClose && (
            <button className="btn btn-ghost shrink-0 !p-2" onClick={onClose} aria-label={t('common.close')} title={t('common.close')}>
              <X size={16} />
            </button>
          )}
        </div>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
      </motion.div>
    </motion.div>
  )
}

/** A labelled row of choices (chips). */
export function ChoiceRow<V extends string | number | boolean>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: ReactNode
  hint?: ReactNode
  value: V
  options: { value: V; label: ReactNode }[]
  onChange: (v: V) => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-fg/10 py-3 first:border-t-0">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{label}</div>
        {hint && <div className="text-xs text-fg/50">{hint}</div>}
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button key={String(o.value)} className="chip" data-on={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
