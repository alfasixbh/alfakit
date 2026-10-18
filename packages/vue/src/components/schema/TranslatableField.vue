<script setup lang="ts">
import type { BaseField } from '@alfakit/core'
import {
  initialTranslatableLocale,
  translatableLocaleField,
  translatableLocalesWithErrors,
} from '@alfakit/core'
import { computed, ref, watch, type Component } from 'vue'
import { useStoreSelector } from '../../composables/use-store'
import { useT } from '../../context'
import { cn } from '../../lib/utils'
import { useFormStore } from '../form/form-context'

/**
 * A `->translatable()` field: a language switcher above the field's own renderer, bound
 * to `{statePath}.{locale}` for the selected language. Languages with a validation error
 * are marked, and the first of them opens after a failed submit.
 */
const props = defineProps<{ component: BaseField; render: Component }>()
const t = useT()
const store = useFormStore()

const locales = computed(() => props.component.translatable?.locales ?? [])
const invalidKey = useStoreSelector(store.store, (state) =>
  translatableLocalesWithErrors(props.component, state.errors).join(','),
)
const invalid = computed(() => (invalidKey.value === '' ? [] : invalidKey.value.split(',')))
const current = ref(initialTranslatableLocale(props.component, store.store.get().errors))

// After a failed submit, show a language that needs attention.
watch(invalidKey, () => {
  if (invalid.value.length > 0 && !invalid.value.includes(current.value)) {
    current.value = invalid.value[0]!
  }
})

// A `LocaleSwitcher` changes the language the fields open on; follow it when it changes.
watch(
  () => props.component.translatable?.defaultLocale ?? '',
  (editing) => {
    if (editing !== '' && locales.value.some((option) => option.code === editing)) {
      current.value = editing
    }
  },
)

const locale = computed(
  () => locales.value.find((candidate) => candidate.code === current.value) ?? locales.value[0],
)
const field = computed(() =>
  locale.value ? translatableLocaleField(props.component, locale.value) : props.component,
)
</script>

<template>
  <div v-if="locale" data-slot="translatable-field" class="flex flex-col gap-1.5">
    <div
      role="group"
      :aria-label="
        t('translatable.languages', { field: props.component.label ?? props.component.name })
      "
      data-slot="translatable-locales"
      class="flex flex-wrap justify-end gap-1"
    >
      <button
        v-for="option in locales"
        :key="option.code"
        type="button"
        :lang="option.tag"
        :aria-pressed="option.code === locale.code"
        :data-active="option.code === locale.code || undefined"
        :data-invalid="invalid.includes(option.code) || undefined"
        :class="
          cn(
            'focus-visible:ring-ring/50 inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors outline-none focus-visible:ring-[3px]',
            option.code === locale.code
              ? 'border-primary bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            invalid.includes(option.code) &&
              option.code !== locale.code &&
              'border-destructive text-destructive',
          )
        "
        @click="current = option.code"
      >
        {{ option.label }}
        <template v-if="invalid.includes(option.code)">
          <span aria-hidden="true" class="bg-destructive size-1.5 rounded-full" />
          <span class="sr-only">({{ t('translatable.has_errors') }})</span>
        </template>
      </button>
    </div>
    <component :is="props.render" :key="locale.code" :component="field" />
  </div>
</template>
