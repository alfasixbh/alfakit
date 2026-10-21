<script lang="ts">
  import { useRegistry } from '../src/context.svelte'

  // What a schema renderer does with a field of type `RatingInput`.
  const Custom = useRegistry().resolve('RatingInput')
</script>

{#if Custom}
  <Custom component={{ props: { label: 'Stars' } }} />
{:else}
  <p>missing</p>
{/if}
