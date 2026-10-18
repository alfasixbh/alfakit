<script lang="ts">
  import type { ColorColumnSchema } from '@alfakit/core'
  import CheckIcon from '@lucide/svelte/icons/check'
  import { useT } from '../../context.svelte'
  import { uniqueKey, valueKey } from '../../lib/keys'
  import { cn } from '../../lib/utils'
  import type { CellProps } from './cell-update.svelte'

  let { column, cell }: CellProps = $props()

  const t = useT()
  const schema = $derived(column as ColorColumnSchema)
  const colors = $derived(
    Array.isArray(cell.state) ? (cell.state as string[]) : cell.state ? [String(cell.state)] : [],
  )
  let copied = $state<string | null>(null)

  // The cell may sit inside a link or a clickable row.
  const copy = (event: MouseEvent, color: string) => {
    event.preventDefault()
    event.stopPropagation()
    void navigator.clipboard?.writeText(color).then(() => {
      copied = color
      setTimeout(() => (copied = null), schema.copyMessageDuration ?? 1500)
    })
  }
</script>

{#if colors.length === 0}
  <span class="text-muted-foreground">—</span>
{:else}
  <div class={cn('flex items-center gap-1.5', schema.wrap ? 'flex-wrap' : 'flex-nowrap')}>
    {#each colors as color, colorIndex (uniqueKey(colors, colorIndex, valueKey))}
      {#if schema.copyable}
        <button
          type="button"
          data-slot="color-copy"
          title={color}
          aria-label={`${t('copy', {}, 'Copy')} ${color}`}
          class="focus-visible:ring-ring/50 inline-flex rounded outline-none focus-visible:ring-[3px]"
          onclick={(event) => copy(event, color)}
        >
          <span
            class="inline-flex size-5 items-center justify-center rounded border shadow-xs"
            style:background-color={color}
          >
            {#if copied === color}<CheckIcon class="size-3 text-white mix-blend-difference" />{/if}
          </span>
        </button>
      {:else}
        <span title={color} class="size-5 rounded border shadow-xs" style:background-color={color}
        ></span>
      {/if}
    {/each}
    {#if schema.copyable && copied}
      <span role="status" class={cn('text-xs', !schema.copyMessage && 'sr-only')}
        >{schema.copyMessage ?? t('copied', {}, 'Copied')}</span
      >
    {/if}
  </div>
{/if}
