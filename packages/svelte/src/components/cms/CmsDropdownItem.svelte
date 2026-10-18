<script lang="ts">
  import type { CmsMenuItemSchema } from '@alfakit/core'
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import { cn } from '../../lib/utils'
  import CmsMenuLink from './CmsMenuLink.svelte'
  import { CMS_LINK_CLASS, useCms } from './context'

  /** A top-level item with a submenu: the link plus a disclosure button for its children. */
  let { item }: { item: CmsMenuItemSchema } = $props()

  const cms = useCms()
  const id = $props.id()
  let open = $state(false)
  let root = $state<HTMLLIElement | null>(null)
  let button = $state<HTMLButtonElement | null>(null)

  $effect(() => {
    if (!open) return

    const close = (event: Event) => {
      if (root && event.target instanceof Node && !root.contains(event.target)) open = false
    }

    document.addEventListener('mousedown', close)
    document.addEventListener('focusin', close)

    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('focusin', close)
    }
  })

  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      open = false
      button?.focus()
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<li bind:this={root} class="relative flex items-center" {onkeydown}>
  <CmsMenuLink {item} class={CMS_LINK_CLASS} />
  <button
    bind:this={button}
    type="button"
    class="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -ms-2 rounded-md p-1.5 outline-none focus-visible:ring-[3px]"
    aria-expanded={open}
    aria-controls={id}
    onclick={() => (open = !open)}
  >
    <ChevronDownIcon
      class={cn('size-4 transition-transform', open && 'rotate-180')}
      aria-hidden="true"
    />
    <span class="sr-only"
      >{cms.t('cms.toggle_submenu', { label: item.label }, `Show the ${item.label} submenu`)}</span
    >
  </button>
  <ul
    {id}
    hidden={!open}
    class="bg-popover text-popover-foreground absolute start-0 top-full z-40 mt-1 min-w-52 rounded-lg border p-1 shadow-md"
  >
    {#each item.children as child (child.id)}
      <li>
        <CmsMenuLink item={child} class={cn(CMS_LINK_CLASS, 'block')} />
        {#if child.children.length > 0}
          <ul class="ms-3 border-s ps-1">
            {#each child.children as grandchild (grandchild.id)}
              <li><CmsMenuLink item={grandchild} class={cn(CMS_LINK_CLASS, 'block')} /></li>
            {/each}
          </ul>
        {/if}
      </li>
    {/each}
  </ul>
</li>
