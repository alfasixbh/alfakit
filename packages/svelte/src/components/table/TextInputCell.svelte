<script lang="ts">
  import type { TextInputColumnSchema } from '@alfakit/core'
  import { untrack } from 'svelte'
  import { colorClass, textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Input } from '../ui/input'
  import { useCellUpdate, type CellProps } from './cell-update.svelte'

  let props: CellProps = $props()

  const schema = $derived(props.column as TextInputColumnSchema)
  const updater = useCellUpdate(() => props)
  const initial = $derived(
    props.cell.state === null || props.cell.state === undefined ? '' : String(props.cell.state),
  )
  // `prefix()` / `suffix()`: text affixes around the input, like the TextInput field.
  const grouped = $derived(Boolean(props.cell.prefix || props.cell.suffix))
  let value = $state(
    untrack(() =>
      props.cell.state === null || props.cell.state === undefined ? '' : String(props.cell.state),
    ),
  )
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<span onclick={(event) => event.stopPropagation()}>
  <span
    data-slot={grouped ? 'input-group' : undefined}
    class={grouped
      ? cn(
          'border-input dark:bg-input/30 has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-ring/50 flex h-8 min-w-32 items-stretch overflow-hidden rounded-md border shadow-xs has-[input:focus-visible]:ring-[3px]',
          updater.error && 'border-destructive',
        )
      : 'contents'}
  >
    {#if props.cell.prefix}
      <span
        data-slot="input-prefix"
        class="text-muted-foreground bg-muted/50 flex items-center border-e px-2 text-sm"
        >{props.cell.prefix}</span
      >
    {/if}
    <span class={cn('relative block', grouped && 'min-w-0 flex-1')}>
      {#if schema.prefixIcon}
        <span
          data-slot="input-prefix-icon"
          aria-hidden="true"
          class={cn(
            'pointer-events-none absolute start-2.5 top-1/2 flex -translate-y-1/2',
            colorClass(textColorClasses, schema.prefixIconColor, 'gray'),
          )}
        >
          <Icon name={schema.prefixIcon} class="size-4" />
        </span>
      {/if}
      <Input
        type={schema.inputType}
        bind:value
        placeholder={schema.placeholder}
        step={schema.step}
        inputmode={schema.inputMode as never}
        disabled={Boolean(props.cell.disabled) || updater.saving}
        aria-invalid={updater.error ? true : undefined}
        class={cn(
          'h-8 min-w-32',
          schema.prefixIcon && 'ps-8',
          schema.suffixIcon && 'pe-8',
          grouped &&
            'h-full rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent',
        )}
        onblur={() => value !== initial && void updater.update(value)}
        onkeydown={(event) =>
          event.key === 'Enter' && (event.currentTarget as HTMLInputElement).blur()}
      />
      {#if schema.suffixIcon}
        <span
          data-slot="input-suffix-icon"
          aria-hidden="true"
          class={cn(
            'pointer-events-none absolute end-2.5 top-1/2 flex -translate-y-1/2',
            colorClass(textColorClasses, schema.suffixIconColor, 'gray'),
          )}
        >
          <Icon name={schema.suffixIcon} class="size-4" />
        </span>
      {/if}
    </span>
    {#if props.cell.suffix}
      <span
        data-slot="input-suffix"
        class="text-muted-foreground bg-muted/50 flex items-center border-s px-2 text-sm"
        >{props.cell.suffix}</span
      >
    {/if}
  </span>
  {#if updater.error}<span class="text-destructive block text-xs">{updater.error}</span>{/if}
</span>
