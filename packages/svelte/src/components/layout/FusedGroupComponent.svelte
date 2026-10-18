<script lang="ts">
  import type { FusedGroupSchema } from '@alfakit/core'
  import { collectFieldStatePaths, gridColumnsClasses } from '@alfakit/core'
  import { useStore } from '../../hooks/store.svelte'
  import { extraProps } from '../../lib/attributes'
  import { cn } from '../../lib/utils'
  import { useOptionalFormStore } from '../form/form-context.svelte'
  import { setFusedGroup } from '../schema/fused-group'
  import RenderComponent from '../schema/RenderComponent.svelte'

  /**
   * Fields fused into one control: one border around them (styled by `themes.css`), the
   * group label above, and the fields' validation errors below.
   */
  let { component }: { component: FusedGroupSchema } = $props()

  setFusedGroup()

  const uid = $props.id()
  const labelId = `${uid}-label`
  const store = useOptionalFormStore()
  const state = store ? useStore(store.store) : null
  const paths = $derived(collectFieldStatePaths(component.schema))
  const errors = $derived(
    state
      ? paths
          .map((path) => state.current.errors[path]?.[0])
          .filter((message): message is string => Boolean(message))
      : [],
  )
</script>

<div
  data-slot="fused-group"
  role="group"
  aria-labelledby={component.label ? labelId : undefined}
  {...extraProps(component.extraAttributes, 'flex flex-col gap-1.5')}
>
  {#if component.label}
    <span id={labelId} class="text-sm leading-none font-medium select-none">
      {component.label}
    </span>
  {/if}
  <div
    data-slot="fused-group-controls"
    data-invalid={errors.length ? '' : undefined}
    class={cn('grid', gridColumnsClasses(component.columns ?? { default: 1 }))}
  >
    {#each component.schema ?? [] as child (child.key)}
      <RenderComponent component={child} />
    {/each}
  </div>
  {#if errors.length}
    <!-- The fields announce their own errors; this list is the visible copy. -->
    <div aria-hidden="true" class="flex flex-col gap-0.5">
      {#each errors as message, index (index)}
        <p class="text-destructive text-xs">{message}</p>
      {/each}
    </div>
  {/if}
</div>
