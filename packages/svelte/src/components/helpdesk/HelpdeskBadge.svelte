<script lang="ts">
  import type { HelpdeskBadge, HelpdeskSla, LocaleFormatter } from '@alfakit/core'
  import { useT } from '../../context.svelte'
  import { badgeColorClasses, colorClass } from '../../lib/colors'
  import { Badge } from '../ui/badge'

  /** A status / priority badge, or an SLA badge with its due time. */
  let {
    badge,
    sla,
    formatter,
  }: { badge?: HelpdeskBadge; sla?: HelpdeskSla; formatter?: LocaleFormatter } = $props()

  const t = useT()
  const color = $derived(badge?.color ?? sla?.color ?? 'gray')
  const due = $derived(
    sla?.dueAt && formatter && ['due_soon', 'breached', 'on_track'].includes(sla.state)
      ? formatter.relative(sla.dueAt)
      : null,
  )
</script>

{#if badge || (sla && sla.state !== 'none')}
  <Badge
    variant="outline"
    class={colorClass(badgeColorClasses, color, 'gray')}
    title={sla?.dueAt && formatter ? formatter.dateTime(sla.dueAt) : undefined}
  >
    {badge?.label ?? sla?.label}
    {#if due}<span class="font-normal opacity-80"
        >· {t('helpdesk.due', { time: due }, 'Due :time')}</span
      >{/if}
  </Badge>
{/if}
