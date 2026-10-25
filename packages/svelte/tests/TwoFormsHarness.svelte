<script lang="ts">
  import type { StandaloneComponentSchema } from '@alfakit/core'
  import AlfakitComponent from '../src/standalone/AlfakitComponent.svelte'

  /** Two standalone components of the same form on one page. */
  let { component }: { component: StandaloneComponentSchema } = $props()
</script>

<AlfakitComponent {component} />
<AlfakitComponent {component} />
