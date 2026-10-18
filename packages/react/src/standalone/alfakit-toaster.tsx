import { resolveToastPosition, type ToastPosition } from '@alfakit/core'
import { useEffect, useMemo } from 'react'
import { Toaster } from '../components/ui/sonner'
import { useOptionalAlfakit, type AlfakitContextValue } from '../context'
import { claimToaster, createStandaloneContext, ensureFlashToasts } from './runtime'

export interface AlfakitToasterProps {
  /** Where toasts appear; `start`/`end` follow the reading direction. */
  position?: ToastPosition
  dir?: 'ltr' | 'rtl'
  /**
   * Render sonner's `<Toaster>` too (default). Pass `false` when your layout already mounts
   * one: flashed Alfakit notifications are then shown through it.
   */
  toaster?: boolean
  /** @internal Set by `<AlfakitComponent>` when it takes the toaster role. */
  claimed?: boolean
}

/**
 * Shows notifications flashed by standalone components (`Notification::make()->send()`
 * from `submit()` or an action) as toasts. Place it once in your app layout; a page whose
 * layout has none gets one from its first `<AlfakitComponent>`.
 *
 * ```tsx
 * <AlfakitToaster />
 * ```
 */
export function AlfakitToaster({
  position,
  dir = 'ltr',
  toaster = true,
  claimed = false,
}: AlfakitToasterProps) {
  const parent = useOptionalAlfakit()

  // Outside <AlfakitComponent> the flash reader needs a registry for custom toast views.
  const context = useMemo<AlfakitContextValue>(
    () => parent ?? createStandaloneContext({ action: '', modal: '' }, undefined, undefined),
    [parent],
  )

  useEffect(() => (claimed ? undefined : claimToaster()), [claimed])

  useEffect(() => {
    ensureFlashToasts(context.registry)
  }, [context])

  if (!toaster) return null

  return <Toaster position={resolveToastPosition(position, dir)} dir={dir} richColors closeButton />
}
