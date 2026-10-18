<script lang="ts">
  import type { BaseField } from '@alfakit/core'
  import {
    initialTranslatableLocale,
    translatableLocaleField,
    translatableLocalesWithErrors,
  } from '@alfakit/core'
  import { untrack } from 'svelte'
  import { useT, type AnyComponent } from '../../context.svelte'
  import { useStoreSelector } from '../../hooks/store.svelte'
  import { cn } from '../../lib/utils'
  import { useFormStore } from '../form/form-context.svelte'

  /**
   * A `->translatable()` field: a language switcher above the field's own renderer, bound
   * to `{statePath}.{locale}` for the selected language. Languages with a validation error
   * are marked, and the first of them opens after a failed submit.
   */
  let { component, render: Render }: { component: BaseField; render: AnyComponent } = $props()

  const t = useT()
  const store = useFormStore()

  const locales = $derived(component.translatable?.locales ?? [])
  const invalidKey = useStoreSelector(store.store, (state) =>
    translatableLocalesWithErrors(component, state.errors).join(','),
  )
  const invalid = $derived(invalidKey.current === '' ? [] : invalidKey.current.split(','))
  let current = $state(
    untrack(() => initialTranslatableLocale(component, store.store.get().errors)),
  )

  // After a failed submit, show a language that needs attention.
  $effect(() => {
    const failed = invalid

    untrack(() => {
      if (failed.length > 0 && !failed.includes(current)) {
        current = failed[0]!
      }
    })
  })

  // A `LocaleSwitcher` changes the language the fields open on; follow it when it changes.
  let seenEditing = untrack(() => component.translatable?.defaultLocale ?? '')

  $effect(() => {
    const editing = component.translatable?.defaultLocale ?? ''

    untrack(() => {
      if (editing === seenEditing) return

      seenEditing = editing

      if (editing !== '' && locales.some((option) => option.code === editing)) {
        current = editing
      }
    })
  })

  const locale = $derived(locales.find((candidate) => candidate.code === current) ?? locales[0])
  const field = $derived(locale ? translatableLocaleField(component, locale) : component)
</script>

{#if locale}
  <div data-slot="translatable-field" class="flex flex-col gap-1.5">
    <div
      role="group"
      aria-label={t('translatable.languages', { field: component.label ?? component.name })}
      data-slot="translatable-locales"
      class="flex flex-wrap justify-end gap-1"
    >
      {#each locales as option (option.code)}
        {@const active = option.code === locale.code}
        {@const hasError = invalid.includes(option.code)}
        <button
          type="button"
          lang={option.tag}
          aria-pressed={active}
          data-active={active || undefined}
          data-invalid={hasError || undefined}
          onclick={() => (current = option.code)}
          class={cn(
            'focus-visible:ring-ring/50 inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors outline-none focus-visible:ring-[3px]',
            active
              ? 'border-primary bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            hasError && !active && 'border-destructive text-destructive',
          )}
        >
          {option.label}
          {#if hasError}
            <span aria-hidden="true" class="bg-destructive size-1.5 rounded-full"></span>
            <span class="sr-only">({t('translatable.has_errors')})</span>
          {/if}
        </button>
      {/each}
    </div>
    {#key locale.code}
      <Render component={field} />
    {/key}
  </div>
{/if}
