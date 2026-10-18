<script lang="ts">
  import { uniqueKey, valueKey } from '../../lib/keys'
  import { applyMask, type TextInputSchema } from '@alfakit/core'
  import EyeIcon from '@lucide/svelte/icons/eye'
  import EyeOffIcon from '@lucide/svelte/icons/eye-off'
  import CheckIcon from '@lucide/svelte/icons/check'
  import CopyIcon from '@lucide/svelte/icons/copy'
  import { onDestroy } from 'svelte'
  import { textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Button } from '../ui/button'
  import { Input } from '../ui/input'
  import { useT } from '../../context.svelte'
  import { extraProps } from '../../lib/attributes'

  let { component }: { component: TextInputSchema } = $props()

  /** Values that are always written left to right, even in an RTL page. */
  const LTR_INPUT_TYPES = new Set(['email', 'url', 'tel', 'password', 'number'])

  const field = useField<string | number | null>(() => component)
  let revealed = $state(false)
  let copied = $state(false)
  let copiedTimer: ReturnType<typeof setTimeout> | undefined

  onDestroy(() => clearTimeout(copiedTimer))

  // `copyable()`: copy the current value; the confirmation stays for `copyMessageDuration`.
  const copy = () => {
    const text = field.value === null || field.value === undefined ? '' : String(field.value)

    void navigator.clipboard?.writeText(text).then(() => {
      copied = true
      clearTimeout(copiedTimer)
      copiedTimer = setTimeout(() => (copied = false), component.copyMessageDuration ?? 1500)
    })
  }

  const type = $derived(
    component.inputType === 'password' && revealed ? 'text' : component.inputType,
  )
  const hasAffixes = $derived(
    Boolean(
      component.prefix ||
      component.suffix ||
      component.prefixIcon ||
      component.suffixIcon ||
      component.revealable ||
      component.copyable,
    ),
  )
  const listId = $derived(component.datalist ? `${field.id}-list` : undefined)

  const t = useT()

  // `mask()`: reformat what was typed (the DOM is corrected too, since a rejected
  // character leaves the bound value unchanged).
  const onInput = (input: HTMLInputElement) => {
    const masked = applyMask(input.value, component.mask)

    if (masked !== input.value) input.value = masked
    field.setValue(masked)
  }
</script>

{#snippet input()}
  <Input
    id={field.id}
    name={component.name}
    {type}
    dir={LTR_INPUT_TYPES.has(component.inputType) ? 'ltr' : 'auto'}
    value={field.value ?? ''}
    oninput={(event) => onInput(event.currentTarget)}
    onblur={field.blur}
    placeholder={component.placeholder}
    disabled={field.disabled}
    readonly={component.readOnly}
    required={component.required}
    autofocus={component.autofocus || undefined}
    minlength={component.minLength}
    maxlength={component.maxLength}
    min={component.min}
    max={component.max}
    step={component.step}
    autocomplete={component.autocomplete as never}
    inputmode={component.inputMode as never}
    autocapitalize={component.autocapitalize as never}
    list={listId}
    {...field.aria}
    {...extraProps(
      component.extraInputAttributes,
      cn(
        hasAffixes &&
          'h-full border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent',
      ),
    )}
  />
{/snippet}

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  {#if hasAffixes}
    <div
      data-slot="input-group"
      class={cn(
        'border-input has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-ring/50 dark:bg-input/30 flex h-9 w-full items-stretch overflow-hidden rounded-md border shadow-xs has-[input:focus-visible]:ring-[3px]',
        field.error && 'border-destructive',
      )}
    >
      {#if component.prefix || component.prefixIcon}
        <span
          class="bg-muted/50 text-muted-foreground flex items-center gap-1 border-e px-3 text-sm"
        >
          <Icon
            name={component.prefixIcon}
            class={component.prefixIconColor && textColorClasses[component.prefixIconColor]}
          />
          {component.prefix}
        </span>
      {/if}
      {@render input()}
      {#if component.suffix || component.suffixIcon}
        <span
          class="bg-muted/50 text-muted-foreground flex items-center gap-1 border-s px-3 text-sm"
        >
          {component.suffix}
          <Icon
            name={component.suffixIcon}
            class={component.suffixIconColor && textColorClasses[component.suffixIconColor]}
          />
        </span>
      {/if}
      {#if component.revealable}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="my-auto me-1"
          onclick={() => (revealed = !revealed)}
          aria-label={revealed
            ? t('form.hide_password', {}, 'Hide password')
            : t('form.show_password', {}, 'Show password')}
        >
          {#if revealed}<Icon
              name="alfakit::forms.components.text-input.actions.hide-password"
              fallback={EyeOffIcon}
            />{:else}<Icon
              name="alfakit::forms.components.text-input.actions.show-password"
              fallback={EyeIcon}
            />{/if}
        </Button>
      {/if}
      {#if component.copyable}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="my-auto me-1"
          data-slot="copy-button"
          onclick={copy}
          aria-label={t('copy', {}, 'Copy')}
        >
          {#if copied}<CheckIcon />{:else}<Icon
              name="alfakit::forms.components.text-input.actions.copy"
              fallback={CopyIcon}
            />{/if}
        </Button>
      {/if}
    </div>
  {:else}
    {@render input()}
  {/if}
  {#if component.copyable && copied}
    <span role="status" class={cn('text-xs', !component.copyMessage && 'sr-only')}>
      {component.copyMessage ?? t('copied', {}, 'Copied')}
    </span>
  {/if}
  {#if component.datalist}
    <datalist id={listId}>
      {#each component.datalist as option, optionIndex (uniqueKey(component.datalist, optionIndex, valueKey))}
        <option value={option}></option>
      {/each}
    </datalist>
  {/if}
</FieldWrapper>
