<script lang="ts">
  import type { TranslationManagerSchema } from '@alfakit/core'
  import TranslationManagerView from './TranslationManagerView.svelte'

  /** The translation editor of alfasix/alfakit-translation-manager (schema component `translation-manager`). */
  let { component }: { component?: TranslationManagerSchema } = $props()
</script>

{#if component}
  {#key component.actionComponent}
    <TranslationManagerView schema={component} />
  {/key}
{/if}
