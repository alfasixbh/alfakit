<script lang="ts">
  import { uniqueKey } from '../../lib/keys'
  import type { Attributes, Breakpoints, SchemaComponent } from '@alfakit/core'
  import {
    containerGridColumnsClasses,
    gridColumnsClasses,
    hasContainerBreakpoints,
  } from '@alfakit/core'
  import { extraProps } from '../../lib/attributes'
  import { cn } from '../../lib/utils'
  import RenderComponent from './RenderComponent.svelte'

  let {
    components,
    columns,
    class: className,
    attributes,
  }: {
    components: SchemaComponent[]
    columns?: Breakpoints
    class?: string
    /** `extraAttributes` of the layout component that owns this grid (Grid, Group, Tab, Step). */
    attributes?: Attributes
  } = $props()
</script>

{#snippet grid()}
  <div
    {...extraProps(
      attributes,
      cn(
        'grid gap-6',
        gridColumnsClasses(columns ?? { default: 1 }),
        containerGridColumnsClasses(columns),
        className,
      ),
    )}
    data-slot="schema"
  >
    {#each components as component, componentIndex (uniqueKey(components, componentIndex, (item) => item.key))}
      <RenderComponent {component} />
    {/each}
  </div>
{/snippet}

<!-- Renders a list of schema components in a responsive grid, resolving each `type` through the registry. -->
{#if hasContainerBreakpoints(columns)}
  <!-- `@md`-style columns follow the width of this wrapper instead of the viewport. -->
  <div data-slot="schema-container" class="@container">{@render grid()}</div>
{:else}
  {@render grid()}
{/if}
