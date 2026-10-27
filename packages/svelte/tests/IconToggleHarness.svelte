<script lang="ts">
  import Icon from '../src/lib/Icon.svelte'

  let { shown, name }: { shown: boolean; name: string } = $props()
</script>

{#if shown}<Icon {name} />{/if}
