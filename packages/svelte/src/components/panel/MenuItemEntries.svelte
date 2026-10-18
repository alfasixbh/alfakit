<script lang="ts">
  import type { MenuItemSchema } from '@alfakit/core'
  import { groupMenuItems } from '@alfakit/core'
  import { DropdownMenuSeparator } from '../ui/dropdown-menu'
  import MenuItemEntry from './MenuItemEntry.svelte'

  /** Menu entries with a separator between their groups. */
  let { items, menu = 'userMenu' }: { items: MenuItemSchema[]; menu?: 'userMenu' | 'tenantMenu' } =
    $props()

  const groups = $derived(groupMenuItems(items))
</script>

{#each groups as group, groupIndex (groupIndex)}
  {#if groupIndex > 0}<DropdownMenuSeparator />{/if}
  {#each group as item, index (index)}
    <MenuItemEntry {item} {menu} />
  {/each}
{/each}
