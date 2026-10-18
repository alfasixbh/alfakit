<script lang="ts" generics="S extends object">
  import type { FieldSchema } from '@alfakit/core'
  import type { LazyLoader } from '../../lib/lazy'
  import Lazy from '../../lib/Lazy.svelte'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Skeleton } from '../ui/skeleton'

  /**
   * A field whose code loads the first time one is shown in the browser; the server render
   * and hydration show its label and a placeholder.
   */
  let {
    loader,
    component,
    height = 'h-9',
  }: { loader: LazyLoader<{ component: S }>; component: S; height?: string } = $props()

  // Every lazily loaded field schema carries the base field keys.
  const schema = $derived(component as unknown as FieldSchema)
  const field = useField<unknown>(() => schema)
</script>

<Lazy {loader} props={{ component }}>
  {#snippet fallback()}
    <FieldWrapper field={schema} htmlFor={field.id} error={field.error}>
      <Skeleton aria-busy="true" data-slot="field-placeholder" class={height} />
    </FieldWrapper>
  {/snippet}
</Lazy>
