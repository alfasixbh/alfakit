<script lang="ts">
  import type { GridSchema, GroupSchema, StepSchema, TabSchema } from '@alfakit/core'
  import { schemaGapClass } from '@alfakit/core'
  import SchemaRenderer from '../schema/SchemaRenderer.svelte'
  import DeferredSchema from './DeferredSchema.svelte'

  let { component }: { component: GridSchema | GroupSchema | TabSchema | StepSchema } = $props()
</script>

<DeferredSchema {component}>
  {#snippet children(loaded)}
    <SchemaRenderer
      components={loaded.schema ?? []}
      columns={loaded.columns}
      attributes={loaded.extraAttributes}
      class={schemaGapClass(loaded) || undefined}
    />
  {/snippet}
</DeferredSchema>
