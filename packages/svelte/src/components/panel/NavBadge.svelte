<script lang="ts">
  import type { NavigationItemSchema } from '@alfakit/core'
  import { useT } from '../../context.svelte'
  import { badgeColorClasses, colorClass } from '../../lib/colors'
  import { cn } from '../../lib/utils'
  import { Badge } from '../ui/badge'

  /** A navigation item's badge, or its placeholder while `deferNavigationBadges()` loads. */
  let { item }: { item: NavigationItemSchema } = $props()

  const t = useT()
</script>

{#if item.badge !== undefined && item.badge !== null}<Badge
    variant="outline"
    class={cn('ms-auto px-1.5 py-0', colorClass(badgeColorClasses, item.badgeColor, 'gray'))}
    title={item.badgeTooltip}>{item.badge}</Badge
  >{:else if item.badgePending}<span
    data-slot="badge"
    role="status"
    aria-busy="true"
    aria-label={t('loading', {}, 'Loading')}
    class="bg-muted-foreground/20 ms-auto inline-block h-4 w-5 animate-pulse rounded-md"
  ></span>{/if}
