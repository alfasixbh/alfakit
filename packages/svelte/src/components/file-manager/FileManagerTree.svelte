<script lang="ts">
  import { untrack } from 'svelte'
  import type { FileManagerController } from '@alfakit/core'
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import FolderIcon from '@lucide/svelte/icons/folder'
  import FolderOpenIcon from '@lucide/svelte/icons/folder-open'
  import { useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { cn } from '../../lib/utils'
  import Self from './FileManagerTree.svelte'

  type DropHandlers = Record<'ondragover' | 'ondragleave' | 'ondrop', (event: DragEvent) => void>

  /** The folder tree of the file manager (and the destination chooser of move and copy). */
  let {
    controller,
    active,
    dropHandlers,
    onOpen,
    parent,
    level = 1,
  }: {
    controller: FileManagerController
    active: string | null
    dropHandlers?: (target: string) => DropHandlers
    onOpen: (path: string) => void
    parent?: string
    level?: number
  } = $props()

  const t = useT()
  const store = useStore(untrack(() => controller.store))
  const ui = $derived(store.current)
  const folders = $derived((ui.tree[parent ?? ''] ?? []).slice())
  const expanded = (path: string) => ui.expanded.includes(path)
</script>

{#if level === 1}
  <nav aria-label={t('file-manager.folders', {}, 'Folders')} data-slot="file-manager-tree">
    <button
      type="button"
      class={cn(
        'hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm',
        active === '' && 'bg-accent font-medium',
      )}
      aria-current={active === '' ? 'page' : undefined}
      onclick={() => onOpen('')}
    >
      <FolderOpenIcon class="text-primary size-4" aria-hidden="true" />
      {t('file-manager.root', {}, 'Files')}
    </button>
    <Self {controller} {active} {dropHandlers} {onOpen} parent="" level={2} />
  </nav>
{:else if folders.length > 0}
  <ul class="flex flex-col" role={level > 2 ? 'group' : undefined}>
    {#each folders as folder (folder.path)}
      <li data-slot="file-manager-tree-item">
        <div
          class={cn(
            'hover:bg-accent flex items-center gap-1 rounded-md pe-2 text-sm',
            active === folder.path && 'bg-accent font-medium',
            ui.dropTarget === folder.path && 'ring-primary ring-2',
          )}
          style:padding-inline-start={`${(level - 2) * 0.75}rem`}
          {...dropHandlers ? dropHandlers(folder.path) : {}}
        >
          {#if folder.hasChildren}
            <button
              type="button"
              class="text-muted-foreground hover:text-foreground rounded p-1"
              aria-expanded={expanded(folder.path)}
              aria-label={expanded(folder.path)
                ? t('file-manager.collapse', { name: folder.name }, 'Collapse :name')
                : t('file-manager.expand', { name: folder.name }, 'Expand :name')}
              onclick={() => void controller.toggleFolder(folder.path)}
            >
              <ChevronRightIcon
                class={cn(
                  'size-3.5 transition-transform',
                  expanded(folder.path) ? 'rotate-90' : 'rtl:rotate-180',
                )}
                aria-hidden="true"
              />
            </button>
          {:else}
            <span class="w-5.5 shrink-0" aria-hidden="true"></span>
          {/if}
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-start"
            aria-current={active === folder.path ? 'page' : undefined}
            onclick={() => onOpen(folder.path)}
          >
            <FolderIcon class="text-primary size-4 shrink-0" aria-hidden="true" />
            <span class="truncate">{folder.name}</span>
          </button>
        </div>
        {#if expanded(folder.path)}
          <Self
            {controller}
            {active}
            {dropHandlers}
            {onOpen}
            parent={folder.path}
            level={level + 1}
          />
        {/if}
      </li>
    {/each}
  </ul>
{/if}
