<script lang="ts">
  import type { BaseField, SchemaComponent } from '@alfakit/core'
  import {
    columnOrderClasses,
    columnSpanClasses,
    columnStartClasses,
    containerColumnSpanClasses,
  } from '@alfakit/core'
  import { useRegistry } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import TranslatableField from './TranslatableField.svelte'

  let { component }: { component: SchemaComponent } = $props()

  const registry = useRegistry()
  const type = $derived(
    component.type === 'View'
      ? ((component as { component?: string }).component ?? 'View')
      : component.type,
  )
  const Resolved = $derived(
    registry.resolve(type) ?? (component.type === 'View' ? registry.resolve('View') : undefined),
  )
  const translatable = $derived(
    Boolean((component as Partial<BaseField>).translatable?.locales?.length),
  )
  const span = $derived(
    cn(
      columnSpanClasses(component.columnSpan),
      containerColumnSpanClasses(component.columnSpan),
      columnStartClasses(component.columnStart),
      columnOrderClasses(component.columnOrder),
    ),
  )
  // Registered `View` components get the PHP `props` spread, as the docs describe.
  const viewProps = $derived(
    component.type === 'View'
      ? ((component as { props?: Record<string, unknown> }).props ?? {})
      : {},
  )
</script>

{#if Resolved}
  <div data-slot="schema-item" data-type={component.type} class={cn('min-w-0', span || undefined)}>
    {#if translatable}
      <TranslatableField component={component as BaseField} render={Resolved} />
    {:else}
      <Resolved {...viewProps} {component} />
    {/if}
  </div>
{:else}
  <div
    class={cn(
      'border-destructive/40 text-destructive rounded-md border border-dashed p-3 text-xs',
      span,
    )}
  >
    Unknown component type <code class="font-mono">{type}</code>. Register it with
    <code class="font-mono">createAlfakit({'{'} components })</code>.
  </div>
{/if}
