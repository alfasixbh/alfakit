<script lang="ts">
  import {
    checkSchemaContract,
    reportSchemaContractMismatch,
    type PanelSchema,
  } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import { useT } from '../../context.svelte'

  /**
   * Renders its children only when the page's schema contract (`alfakit.schemaContract`) has
   * the major version this frontend understands; otherwise a translated message replaces the
   * page and the mismatch is logged once, naming both versions.
   */
  let { panel, children }: { panel: PanelSchema | undefined; children?: Snippet } = $props()

  const t = useT()
  const check = $derived(checkSchemaContract(panel?.schemaContract))

  $effect.pre(() => {
    reportSchemaContractMismatch(check)
  })
</script>

{#if check.compatible}
  {@render children?.()}
{:else}
  <div
    role="alert"
    data-slot="schema-contract-mismatch"
    class="bg-background text-foreground mx-auto flex min-h-svh w-full max-w-lg flex-col items-center justify-center gap-2 p-6 text-center"
  >
    <h1 class="text-lg font-semibold">{t('schema_contract.title')}</h1>
    <p class="text-muted-foreground text-sm">
      {t('schema_contract.body', { server: check.server ?? '?', client: check.client })}
    </p>
  </div>
{/if}
