<script lang="ts">
  import type { DebugNode } from '@alfakit/core'
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import DebugTreeNode from './DebugTreeNode.svelte'
  import { useT } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import { Badge } from '../ui/badge'
  import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'

  /** One node of the debug panel's schema tree, collapsible when it has children. */
  let { node, depth }: { node: DebugNode; depth: number } = $props()

  const t = useT()
  // svelte-ignore state_referenced_locally
  let open = $state(depth < 2)
  const children = $derived(node.children ?? [])
  const details = $derived(
    Object.entries(node.details ?? {}).filter(
      ([, value]) => value !== null && value !== false && value !== '',
    ),
  )
  const badge = $derived(
    node.authorized === false
      ? t('debug.unauthorized', {}, 'unauthorized')
      : (node.reason ?? t('debug.hidden', {}, 'hidden')),
  )
</script>

{#snippet row()}
  <div
    class={cn(
      'flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5',
      !node.visible && 'text-muted-foreground',
    )}
  >
    {#if children.length > 0}
      <ChevronRightIcon
        class={cn(
          'size-3.5 shrink-0 transition-transform rtl:rotate-180',
          open && 'rotate-90 rtl:rotate-90',
        )}
      />
    {:else}
      <span class="size-3.5 shrink-0"></span>
    {/if}
    <span class={cn('font-semibold', !node.visible && 'line-through')}>{node.type}</span>
    {#if node.key}<span class="truncate">{node.key}</span>{/if}
    {#if node.label && node.label !== node.key}
      <span class="text-muted-foreground truncate">“{node.label}”</span>
    {/if}
    {#each details as [name, value] (name)}
      <span class="text-muted-foreground truncate"
        >{value === true ? name : `${name}=${String(value)}`}</span
      >
    {/each}
    {#if !node.visible}
      <Badge
        variant={node.authorized === false ? 'destructive' : 'outline'}
        class="ms-auto shrink-0 font-sans">{badge}</Badge
      >
    {/if}
  </div>
{/snippet}

<li style:padding-inline-start="{depth * 12}px">
  {#if children.length > 0}
    <Collapsible bind:open>
      <CollapsibleTrigger class="hover:bg-muted/60 w-full rounded text-start">
        {@render row()}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul class="space-y-0.5">
          {#each children as child, index (`${child.key ?? child.type}-${index}`)}
            <DebugTreeNode node={child} depth={1} />
          {/each}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  {:else}
    {@render row()}
  {/if}
</li>
