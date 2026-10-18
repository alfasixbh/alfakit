import type { ImpersonationSchema } from '@alfakit/core'
import { router } from '@inertiajs/react'
import { LogOutIcon, VenetianMaskIcon } from 'lucide-react'
import { useState } from 'react'
import { usePanel } from '../../context'
import { Button } from '../ui/button'

/**
 * Shown while impersonating another user: who you are signed in as, and a button that
 * returns to your own account. Replace it with `components: { 'panel:impersonation-banner': … }`.
 */
export function ImpersonationBanner({ impersonation }: { impersonation?: ImpersonationSchema }) {
  const panel = usePanel()
  const current = impersonation ?? panel?.impersonation
  const [leaving, setLeaving] = useState(false)

  if (!current) {
    return null
  }

  const leave = () => {
    setLeaving(true)
    router.post(current.leaveUrl, {}, { onFinish: () => setLeaving(false) })
  }

  return (
    <div
      data-slot="impersonation-banner"
      role="status"
      className="bg-foreground text-background fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-full py-1.5 ps-4 pe-1.5 text-sm shadow-lg"
    >
      <VenetianMaskIcon className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{current.label}</span>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="rounded-full"
        disabled={leaving}
        onClick={leave}
      >
        <LogOutIcon className="rtl:rotate-180" aria-hidden="true" />
        {current.leaveLabel}
      </Button>
    </div>
  )
}
