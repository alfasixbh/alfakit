<script lang="ts">
  import type { SubNavigationSchema } from '@alfakit/core'
  import { useT } from '../../context.svelte'
  import Icon from '../../lib/Icon.svelte'
  import Slot from './Slot.svelte'
  import SubNavigationLink from './SubNavigationLink.svelte'

  /** The links of a page's sub-navigation (cluster pages or record pages). */
  let { navigation }: { navigation: SubNavigationSchema } = $props()

  const t = useT()
  const label = $derived(t('sub_navigation', {}, 'Page navigation'))
  const items = $derived(navigation.groups.flatMap((group) => group.items))
</script>

{#if navigation.position === 'top'}
  <nav
    aria-label={label}
    data-slot="sub-navigation"
    data-position="top"
    class="relative flex gap-1 overflow-x-auto border-b pb-2"
  >
    {#each items as item, index (`${index}-${item.label}-${item.url ?? ''}`)}
      <SubNavigationLink {item} tab={true} />
    {/each}
  </nav>
{:else}
  <nav
    aria-label={label}
    data-slot="sub-navigation"
    data-position={navigation.position}
    class="flex w-full shrink-0 flex-col gap-4 md:w-56"
  >
    <Slot name="page.sub-navigation.sidebar.before" />
    {#each navigation.groups as group, index (group.label ?? `group-${index}`)}
      <div class="flex flex-col gap-1">
        {#if group.label}
          <p class="text-muted-foreground flex items-center gap-1.5 px-3 text-xs font-medium">
            {#if group.icon}<Icon name={group.icon} class="size-3.5" />{/if}
            {group.label}
          </p>
        {/if}
        <ul class="flex flex-col gap-0.5">
          {#each group.items as item, itemIndex (`${itemIndex}-${item.label}-${item.url ?? ''}`)}
            <li><SubNavigationLink {item} tab={false} /></li>
          {/each}
        </ul>
      </div>
    {/each}
    <Slot name="page.sub-navigation.sidebar.after" />
  </nav>
{/if}
