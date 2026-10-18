<script lang="ts">
  import type { BaseComponent } from '@alfakit/core'
  import { schemaGapClass } from '@alfakit/core'
  import { cn } from '../../lib/utils'
  import SchemaRenderer from '../schema/SchemaRenderer.svelte'

  /**
   * Renders a layout component's child schema (`component.schema`) in its grid
   * (`columns`, `dense()`, `gap(false)`), for custom schema components:
   * `<SchemaChildren {component} />`.
   */
  let {
    component,
    class: className,
  }: {
    component: Pick<BaseComponent, 'schema' | 'columns' | 'dense' | 'gap'>
    class?: string
  } = $props()
</script>

<SchemaRenderer
  components={component.schema ?? []}
  columns={component.columns}
  class={cn(schemaGapClass(component), className)}
/>
