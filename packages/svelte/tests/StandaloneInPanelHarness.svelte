<script lang="ts">
  import type { StandaloneComponentSchema } from '@alfakit/core'
  import { provideAlfakit, type AlfakitContextValue } from '../src/context.svelte'
  import AlfakitComponent from '../src/standalone/AlfakitComponent.svelte'

  /** A panel page (its context is provided) rendering a standalone component. */
  let { component, panel }: { component: StandaloneComponentSchema; panel: AlfakitContextValue } =
    $props()

  provideAlfakit(panel)
</script>

<AlfakitComponent {component} />
