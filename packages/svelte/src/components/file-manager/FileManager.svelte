<script lang="ts">
  import type { FileManagerSchema } from '@alfakit/core'
  import FileManagerView from './FileManagerView.svelte'

  /** The file manager of alfasix/alfakit-file-manager (schema component `file-manager`). */
  let { component }: { component?: FileManagerSchema } = $props()
</script>

{#if component}
  {#key `${component.disk}:${component.mode}`}
    <FileManagerView schema={component} />
  {/key}
{/if}
