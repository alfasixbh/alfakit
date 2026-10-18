<script lang="ts">
  import type { ModalTableSelectSchema } from '@alfakit/core'
  import { fieldIds, modalTableSelected } from '@alfakit/core'
  import XIcon from '@lucide/svelte/icons/x'
  import { useT } from '../../context.svelte'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Badge } from '../ui/badge'
  import { Button } from '../ui/button'
  import Icon from '../../lib/Icon.svelte'
  import ModalTablePicker from './ModalTablePicker.svelte'

  let { component }: { component: ModalTableSelectSchema } = $props()

  /**
   * Select records from a table in a modal. The table (columns, search, filters, sorting,
   * pagination) comes from the server's picker endpoint; the field keeps only keys, with
   * labels from the server.
   */
  const t = useT()
  const field = useField<unknown>(() => component)
  const multiple = $derived(Boolean(component.multiple))
  const selected = $derived(modalTableSelected(field.value, multiple))
  const locked = $derived(field.disabled || field.readOnly)
  let open = $state(false)
  let picked = $state<Record<string, string>>({})
  const labels = $derived({ ...picked, ...component.selectedLabels })

  const store = (keys: string[]) => field.setValue(multiple ? keys : (keys[0] ?? null))
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  <div
    id={field.id}
    role="group"
    data-slot="modal-table-select"
    class="flex flex-wrap items-center gap-2"
    aria-labelledby={component.label ? fieldIds(field.id).label : undefined}
    aria-describedby={field.aria['aria-describedby']}
  >
    {#if selected.length === 0}
      <span class="text-muted-foreground text-sm"
        >{component.placeholder ?? t('table_select.none', {}, 'Nothing selected')}</span
      >
    {:else}
      {#each selected as key (key)}
        <Badge variant="secondary" class="gap-1 pe-1">
          <span>{labels[key] ?? key}</span>
          {#if !locked}
            <button
              type="button"
              class="hover:bg-foreground/10 rounded-sm"
              aria-label={t('table_select.remove', { label: labels[key] ?? key }, 'Remove :label')}
              onclick={() => store(selected.filter((candidate) => candidate !== key))}
              ><XIcon class="size-3" /></button
            >
          {/if}
        </Badge>
      {/each}
    {/if}
    {#if !locked}
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-haspopup="dialog"
        onclick={() => (open = true)}
        >{#if component.selectActionIcon}<Icon
            name={component.selectActionIcon}
          />{/if}{selected.length > 0 && !multiple
          ? t('table_select.change', {}, 'Change')
          : component.selectActionLabel}</Button
      >
    {/if}
  </div>
  {#if open}
    <ModalTablePicker
      {component}
      initial={selected}
      onclose={() => (open = false)}
      onconfirm={(keys, newLabels) => {
        picked = { ...picked, ...newLabels }
        store(keys)
        open = false
      }}
    />
  {/if}
</FieldWrapper>
