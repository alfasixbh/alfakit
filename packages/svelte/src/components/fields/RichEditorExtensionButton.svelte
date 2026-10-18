<script lang="ts">
  import type { RichEditorPanel, RichEditorSchema } from '@alfakit/core'
  import BlocksIcon from '@lucide/svelte/icons/blocks'
  import BracesIcon from '@lucide/svelte/icons/braces'
  import { useT } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import { Button } from '../ui/button'

  /** The toolbar button that opens the custom blocks or merge tags panel. */
  let {
    name,
    component,
    editable,
    open,
    onToggle,
  }: {
    name: RichEditorPanel
    component: RichEditorSchema
    editable: boolean
    open: boolean
    onToggle: () => void
  } = $props()

  const t = useT()

  const count = $derived(
    name === 'customBlocks'
      ? (component.customBlocks ?? []).length
      : (component.mergeTags ?? []).length,
  )
  const label = $derived(
    name === 'customBlocks'
      ? t('editor.custom_blocks', {}, 'Insert block')
      : t('editor.merge_tags', {}, 'Insert merge tag'),
  )
</script>

{#if count > 0}
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    aria-label={label}
    title={label}
    aria-pressed={open}
    aria-expanded={open}
    disabled={!editable}
    class={cn(open && 'bg-accent text-accent-foreground')}
    onmousedown={(event: MouseEvent) => event.preventDefault()}
    onclick={onToggle}
  >
    {#if name === 'customBlocks'}<BlocksIcon />{:else}<BracesIcon />{/if}
  </Button>
{/if}
