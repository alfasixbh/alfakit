<script lang="ts">
  import { slotItems } from '@alfakit/core'
  import { usePanel } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import RenderComponent from '../schema/RenderComponent.svelte'

  /**
   * Renders content added with `Panel::slot('name', …)` or `Slots::register()` on the
   * server: HTML or schema components (`Text`, `Html`, `View`, …). Renders nothing when
   * the slot is empty. `scope` is the component key (`relationManager:<class>`,
   * `widget:<id>`) of the table, relation manager or widget the slot belongs to. `data`
   * is what this render is about (a header cell's column, a modal's action): items
   * registered with `when: ['column' => 'title']` only render where it matches.
   */
  let {
    name,
    scope,
    data,
    class: className,
  }: {
    name: string
    scope?: string | null
    data?: Record<string, unknown> | null
    class?: string
  } = $props()

  const items = $derived(slotItems(usePanel().slots, name, scope, data))
</script>

{#if items.length > 0}
  <div data-slot-name={name} class={cn('contents', className)}>
    {#each items as item, index (index)}
      {#if item.type === 'html'}
        <div class="contents">{@html item.html}</div>
      {:else}
        <RenderComponent component={item.component} />
      {/if}
    {/each}
  </div>
{/if}
