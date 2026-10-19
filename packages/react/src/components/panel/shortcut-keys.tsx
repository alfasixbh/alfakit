import { shortcutSteps } from '@alfakit/core'
import { useT } from '../../context'
import { useHydrated } from '../../hooks/use-hydrated'
import { cn } from '../../lib/utils'

/**
 * A key binding as `<kbd>` keys (`G` then `D`, `⌘K`). The keys depend on the visitor's
 * platform (⌘ or Ctrl), so they render after hydration.
 */
export function ShortcutKeys({ binding, className }: { binding: string; className?: string }) {
  const t = useT()
  const hydrated = useHydrated()

  if (!hydrated) return null

  const steps = shortcutSteps(binding)

  return (
    <span data-slot="shortcut-keys" className={cn('inline-flex items-center gap-1', className)}>
      {steps.map((step, index) => (
        <span key={index} className="inline-flex items-center gap-1">
          {index > 0 && (
            <span className="text-muted-foreground text-[10px]">
              {t('shortcuts.then', {}, 'then')}
            </span>
          )}
          <kbd
            dir="ltr"
            className="bg-muted text-muted-foreground rounded border px-1.5 font-mono text-[10px] leading-5"
          >
            {step}
          </kbd>
        </span>
      ))}
    </span>
  )
}
