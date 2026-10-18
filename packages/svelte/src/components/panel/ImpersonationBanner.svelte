<script lang="ts">
  import type { ImpersonationSchema } from '@alfakit/core'
  import LogOutIcon from '@lucide/svelte/icons/log-out'
  import VenetianMaskIcon from '@lucide/svelte/icons/venetian-mask'
  import { router } from '@inertiajs/svelte'
  import { usePanel } from '../../context.svelte'
  import { Button } from '../ui/button'

  /**
   * Shown while impersonating another user: who you are signed in as, and a button that
   * returns to your own account. Replace it with `components: { 'panel:impersonation-banner': … }`.
   */
  let { impersonation }: { impersonation?: ImpersonationSchema } = $props()

  const current = $derived(impersonation ?? usePanel()?.impersonation)
  let leaving = $state(false)

  function leave(): void {
    if (!current) return

    leaving = true
    router.post(current.leaveUrl, {}, { onFinish: () => (leaving = false) })
  }
</script>

{#if current}
  <div
    data-slot="impersonation-banner"
    role="status"
    class="bg-foreground text-background fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-full py-1.5 ps-4 pe-1.5 text-sm shadow-lg"
  >
    <VenetianMaskIcon class="size-4 shrink-0" aria-hidden="true" />
    <span class="min-w-0 truncate">{current.label}</span>
    <Button
      type="button"
      size="sm"
      variant="secondary"
      class="rounded-full"
      disabled={leaving}
      onclick={leave}
    >
      <LogOutIcon class="rtl:rotate-180" aria-hidden="true" />
      {current.leaveLabel}
    </Button>
  </div>
{/if}
