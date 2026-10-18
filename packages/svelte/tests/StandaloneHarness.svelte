<script lang="ts">
  import type { ContentBlock, StandaloneComponentSchema } from '@alfakit/core'
  import type { AnyComponent } from '../src/context.svelte'
  import AlfakitComponent from '../src/standalone/AlfakitComponent.svelte'
  import AlfakitToaster from '../src/standalone/AlfakitToaster.svelte'

  /** A host page rendering a standalone component, optionally with a layout toaster and a custom block layout. */
  let {
    component,
    components,
    withToaster = false,
    customLayout = false,
    class: className,
  }: {
    component: StandaloneComponentSchema
    components?: Record<string, AnyComponent>
    withToaster?: boolean
    customLayout?: boolean
    class?: string
  } = $props()
</script>

{#if withToaster}
  <AlfakitToaster toaster={false} />
{/if}
{#if customLayout}
  <AlfakitComponent {component} {components} class={className}>
    {#snippet children(blocks: ContentBlock[])}
      <section data-testid="custom-layout">{blocks.length} block</section>
    {/snippet}
  </AlfakitComponent>
{:else}
  <AlfakitComponent {component} {components} class={className} />
{/if}
