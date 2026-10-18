<script lang="ts">
  import type { IconEntrySchema } from '@alfakit/core'
  import { textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import EntryLink from './EntryLink.svelte'
  import EntryPlaceholder from './EntryPlaceholder.svelte'
  import EntryWrapper from './EntryWrapper.svelte'

  const ICON_SIZES: Record<string, string> = {
    xs: 'size-3',
    sm: 'size-4',
    md: 'size-5',
    lg: 'size-6',
    xl: 'size-8',
    '2xl': 'size-10',
  }

  let { component }: { component: IconEntrySchema } = $props()
</script>

<EntryWrapper entry={component}>
  {#if component.icon}
    <EntryLink entry={component}>
      <Icon
        name={component.icon}
        class={cn(
          ICON_SIZES[component.size ?? 'md'],
          component.color && textColorClasses[component.color],
        )}
      />
    </EntryLink>
  {:else}
    <EntryPlaceholder entry={component} />
  {/if}
</EntryWrapper>
