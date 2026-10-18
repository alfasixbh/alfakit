<script lang="ts">
  import type { Component } from 'svelte'
  import { TooltipProvider } from '../src/components/ui/tooltip'
  import { provideAlfakit } from '../src/context.svelte'
  import { context } from './mocks'

  /** Renders `component` (and optional `extra` components) inside the Alfakit context. */

  let {
    component,
    props = {},
    extra = [],
  }: {
    component: Component<any>
    props?: Record<string, unknown>
    extra?: Component<any>[]
  } = $props()

  provideAlfakit(context)
</script>

<TooltipProvider>
  {@const Inner = component}
  <Inner {...props} />
  {#each extra as Extra, index (index)}
    <Extra />
  {/each}
</TooltipProvider>
