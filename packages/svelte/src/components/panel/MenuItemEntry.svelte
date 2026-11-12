<script lang="ts">
  import type { MenuItemSchema } from '@alfakit/core'
  import { menuActionContext } from '@alfakit/core'
  import { Link, router } from '@inertiajs/svelte'
  import { useActionRunner, usePageSchema } from '../../context.svelte'
  import { colorClass as resolveColorClass, textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { DropdownMenuItem } from '../ui/dropdown-menu'
  import NewTabHint from '../../lib/NewTabHint.svelte'

  /**
   * An entry in the user or tenant menu: colour, icon, new tab and POST links, or an
   * `Action` (server logic, modals) run through the action endpoint as a menu action.
   */
  let { item, menu = 'userMenu' }: { item: MenuItemSchema; menu?: 'userMenu' | 'tenantMenu' } =
    $props()

  const runner = useActionRunner()
  const token = $derived(usePageSchema()?.token ?? '')
  // Unknown values get no class (custom names get theirs).
  const colorClass = $derived(
    cn(item.color && resolveColorClass(textColorClasses, item.color, item.color)),
  )

  const select = () => {
    if (item.action) {
      void runner.trigger(item.action, menuActionContext(token, menu))

      return
    }

    if (item.url && item.method === 'post') router.post(item.url)
  }
</script>

{#if item.action || item.method === 'post'}
  <DropdownMenuItem onSelect={select} disabled={item.action?.disabled} title={item.action?.tooltip}>
    {#if item.icon}<Icon name={item.icon} class={colorClass} />{/if}
    <span class={colorClass}>{item.label}</span>
  </DropdownMenuItem>
{:else}
  <!-- A real link, as in React and Vue: middle-click, Cmd-click and "copy link" work. -->
  <DropdownMenuItem>
    {#snippet child({ props })}
      {#if item.openInNewTab}
        <a {...props} href={item.url} target="_blank" rel="noopener noreferrer">
          {#if item.icon}<Icon name={item.icon} class={colorClass} />{/if}
          <span class={colorClass}>{item.label}</span>
          <NewTabHint />
        </a>
      {:else}
        <Link {...props} href={item.url ?? '#'}>
          {#if item.icon}<Icon name={item.icon} class={colorClass} />{/if}
          <span class={colorClass}>{item.label}</span>
        </Link>
      {/if}
    {/snippet}
  </DropdownMenuItem>
{/if}
