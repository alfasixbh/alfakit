<script lang="ts">
  import type { RichEditorPanel, RichEditorSchema } from '@alfakit/core'
  import { groupCustomBlocks, mergeTagText } from '@alfakit/core'
  import BlocksIcon from '@lucide/svelte/icons/blocks'
  import XIcon from '@lucide/svelte/icons/x'
  import { useT } from '../../context.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Button } from '../ui/button'
  import { Input } from '../ui/input'

  /**
   * The custom blocks or merge tags panel: beside the content on wide editors, above it on
   * narrow ones. Blocks are grouped, optionally searchable and shown as a grid.
   */
  let {
    panel,
    component,
    editable,
    sticky,
    onInsertBlock,
    onInsertMergeTag,
    onClose,
  }: {
    panel: RichEditorPanel
    component: RichEditorSchema
    editable: boolean
    /** `top` of a sticky panel, or null. */
    sticky: string | null
    onInsertBlock: (id: string) => void
    onInsertMergeTag: (id: string) => void
    onClose: () => void
  } = $props()

  const t = useT()

  let search = $state('')

  const heading = $derived(
    panel === 'customBlocks'
      ? t('editor.custom_blocks_heading', {}, 'Custom blocks')
      : t('editor.merge_tags_heading', {}, 'Merge tags'),
  )
  const groups = $derived(
    panel === 'customBlocks' ? groupCustomBlocks(component.customBlocks ?? [], search) : [],
  )
  const grid = $derived(Boolean(component.customBlocksGrid))
  const itemClass =
    'hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/50 flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50'
  const closeLabel = $derived(t('editor.close_panel', {}, 'Close panel'))
  const searchLabel = $derived(t('editor.search_blocks', {}, 'Search blocks'))
</script>

<aside
  aria-label={heading}
  data-slot="rich-editor-panel"
  data-panel={panel}
  class="bg-muted/20 shrink-0 border-b @2xl:w-64 @2xl:border-s @2xl:border-b-0"
>
  <!-- The offset is a runtime value: no Tailwind class can hold it. -->
  <div
    class={cn('flex flex-col gap-2 p-2', sticky !== null && '@2xl:sticky')}
    style:top={sticky ?? undefined}
  >
    <div class="flex items-center justify-between gap-2">
      <span class="text-muted-foreground text-xs font-medium">{heading}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={closeLabel}
        title={closeLabel}
        onmousedown={(event: MouseEvent) => event.preventDefault()}
        onclick={onClose}
      >
        <XIcon />
      </Button>
    </div>
    {#if panel === 'customBlocks' && component.searchableCustomBlocks}
      <Input
        type="search"
        bind:value={search}
        aria-label={searchLabel}
        placeholder={searchLabel}
        class="h-8"
      />
    {/if}
    {#if panel === 'customBlocks'}
      {#if groups.length === 0}
        <p class="text-muted-foreground px-2 py-1.5 text-sm">
          {t('no_results', {}, 'No results.')}
        </p>
      {:else}
        {#each groups as { group, blocks } (group ?? '')}
          <div role="group" aria-label={group ?? heading}>
            {#if group}
              <div class="text-muted-foreground px-2 pt-1 pb-0.5 text-xs font-medium">
                {group}
              </div>
            {/if}
            <div class={cn(grid ? 'grid grid-cols-2 gap-1' : 'flex flex-col gap-0.5')}>
              {#each blocks as block (block.id)}
                <button
                  type="button"
                  disabled={!editable}
                  class={cn(itemClass, grid && 'flex-col justify-center border py-3 text-center')}
                  onmousedown={(event) => event.preventDefault()}
                  onclick={() => onInsertBlock(block.id)}
                >
                  {#if block.icon}
                    <Icon name={block.icon} class="size-4 shrink-0" />
                  {:else}
                    <BlocksIcon class="size-4 shrink-0" />
                  {/if}
                  <span class="truncate">{block.label}</span>
                </button>
              {/each}
            </div>
          </div>
        {/each}
      {/if}
    {:else}
      <div class="flex flex-col gap-0.5">
        {#each component.mergeTags ?? [] as tag (tag.id)}
          <button
            type="button"
            disabled={!editable}
            class={itemClass}
            onmousedown={(event) => event.preventDefault()}
            onclick={() => onInsertMergeTag(tag.id)}
          >
            <span class="truncate">{tag.label}</span>
            <span class="text-muted-foreground ms-auto font-mono text-xs" dir="ltr">
              {mergeTagText({ id: tag.id })}
            </span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</aside>
