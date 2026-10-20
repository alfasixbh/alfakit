<script lang="ts">
  import { AlfakitWidgets } from '../src/starter-kit'

  let { panel, class: className }: { panel?: string; class?: string } = $props()
</script>

<AlfakitWidgets {panel} class={className}>
  <p>Placeholder boxes</p>
</AlfakitWidgets>
