<script lang="ts" module>
  import type { IconPickerSchema } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // The picker's code loads the first time an icon picker is shown.
  const loader = lazyLoader<{ component: IconPickerSchema }>(() =>
    import('./IconPickerField.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import { fieldIds, iconPickerPreview } from '@alfakit/core'
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down'
  import Lazy from '../../lib/Lazy.svelte'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import IconPickerValue from './IconPickerValue.svelte'

  let { component }: { component: IconPickerSchema } = $props()

  const field = useField<string | null>(() => component)
  const current = $derived(
    typeof field.value === 'string' && field.value !== '' ? field.value : null,
  )
</script>

<Lazy {loader} props={{ component }}>
  {#snippet fallback()}
    <!-- What the server renders and hydration shows: the selected icon, not yet interactive. -->
    <FieldWrapper field={component} htmlFor={field.id} error={field.error}>
      <div data-slot="icon-picker" class="flex items-center gap-2">
        <button
          id={field.id}
          type="button"
          disabled
          aria-busy="true"
          data-slot="icon-picker-trigger"
          data-input=""
          {...field.aria}
          aria-labelledby={`${fieldIds(field.id).label} ${field.id}-value`}
          class="border-input dark:bg-input/30 flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border bg-transparent px-3 text-start text-sm shadow-xs"
        >
          <IconPickerValue
            id={`${field.id}-value`}
            {component}
            value={current}
            preview={iconPickerPreview(component.selected, current)}
          />
          <ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
        </button>
      </div>
    </FieldWrapper>
  {/snippet}
</Lazy>
