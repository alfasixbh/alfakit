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
    class="flex w-full shrink-0 flex-row gap-4 overflow-x-auto border-b pb-2 @2xl:w-56 @2xl:flex-col @2xl:overflow-visible @2xl:border-b-0 @2xl:pb-0"
  >
    <Slot name="page.sub-navigation.sidebar.before" />
    {#each navigation.groups as group, index (group.label ?? `group-${index}`)}
      <div class="flex shrink-0 flex-row items-center gap-1 @2xl:flex-col @2xl:items-stretch">
        {#if group.label}
          <p
            class="text-muted-foreground flex items-center gap-1.5 px-3 text-xs font-medium whitespace-nowrap"
          >
            {#if group.icon}<Icon name={group.icon} class="size-3.5" />{/if}
            {group.label}
          </p>
        {/if}
        <ul class="flex flex-row gap-0.5 @2xl:flex-col">
          {#each group.items as item, itemIndex (`${itemIndex}-${item.label}-${item.url ?? ''}`)}
            <li><SubNavigationLink {item} tab={false} /></li>
          {/each}
        </ul>
      </div>
    {/each}
    <Slot name="page.sub-navigation.sidebar.after" />
  </nav>
{/if}
