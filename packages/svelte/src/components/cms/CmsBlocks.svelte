<script lang="ts">
  import { cmsBlockKey, cmsBlocks, type CmsBlockSchema } from '@alfakit/core'
  import { getContext, hasContext, setContext } from 'svelte'
  import { useOptionalRegistry, type AnyComponent } from '../../context.svelte'
  import { CMS_BLOCK_COMPONENTS } from './blocks'
  import { CMS_COMPONENTS_CONTEXT, useCms } from './context'

  /**
   * Renders rendered CMS blocks (`page.blocks`, `Cms::blocks()`, the JSON API). Each type
   * resolves, in order, to `components[type]`, the registry's `cms:block:{type}` and the
   * built-in renderer; unknown types render nothing.
   */
  let {
    blocks,
    components,
  }: { blocks: CmsBlockSchema[] | null | undefined; components?: Record<string, AnyComponent> } =
    $props()

  const registry = useOptionalRegistry()
  const cms = useCms()
  const outer = hasContext(CMS_COMPONENTS_CONTEXT)
    ? getContext<{ readonly current: Record<string, AnyComponent> }>(CMS_COMPONENTS_CONTEXT)
    : null
  const merged = $derived(
    components ? { ...(outer?.current ?? {}), ...components } : (outer?.current ?? {}),
  )

  // Blocks inside columns resolve with the same components.
  setContext(CMS_COMPONENTS_CONTEXT, {
    get current() {
      return merged
    },
  })

  const rendered = $derived(
    cmsBlocks(blocks)
      .map((block) => ({
        block,
        Component:
          merged[block.type] ??
          cms.components[block.type] ??
          registry?.resolve(cmsBlockKey(block.type)) ??
          CMS_BLOCK_COMPONENTS[block.type],
      }))
      .filter(
        (entry): entry is { block: CmsBlockSchema; Component: AnyComponent } =>
          entry.Component !== undefined,
      ),
  )
</script>

{#each rendered as { block, Component } (block.id)}
  <div id={block.id} data-slot="cms-block" data-cms-block={block.type}>
    <Component {block} data={block.data} />
  </div>
{/each}
