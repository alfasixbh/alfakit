<script lang="ts">
  import type { DeferredBadgeSchema, TabSchema } from '@alfakit/core'
  import { loadDeferredBadge, reportRequestError } from '@alfakit/core'
  import { onDestroy, onMount } from 'svelte'
  import { usePanel } from '../../context.svelte'
  import { badgeColorClasses, colorClass } from '../../lib/colors'
  import { cn } from '../../lib/utils'
  import { usePageActionContext } from '../actions/action-context'
  import { useOptionalFormStore } from '../form/form-context.svelte'
  import { Badge } from '../ui/badge'

  /** A schema tab's badge; `deferBadge()` badges load after mounting. */
  let { tab }: { tab: TabSchema } = $props()

  const form = useOptionalFormStore()
  const panel = usePanel()
  const page = usePageActionContext()
  const controller = typeof AbortController === 'undefined' ? null : new AbortController()
  let deferred = $state<DeferredBadgeSchema>({})

  const badge = $derived<DeferredBadgeSchema>(
    tab.badgeDeferred
      ? deferred
      : { badge: tab.badge, badgeColor: tab.badgeColor, badgeTooltip: tab.badgeTooltip },
  )

  onMount(() => {
    const url = panel?.endpoints?.schemaDeferred

    if (!tab.badgeDeferred || !url) return

    loadDeferredBadge({ url, token: page.token, key: tab.key, form, signal: controller?.signal })
      .then((loaded) => {
        deferred = loaded
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') reportRequestError(error)
      })
  })

  onDestroy(() => controller?.abort())
</script>

{#if badge.badge !== undefined && badge.badge !== null}
  <Badge
    variant="outline"
    title={badge.badgeTooltip ?? undefined}
    class={cn(
      'ms-1 px-1.5 py-0',
      colorClass(badgeColorClasses, badge.badgeColor ?? undefined, 'gray'),
    )}>{badge.badge}</Badge
  >
{/if}
