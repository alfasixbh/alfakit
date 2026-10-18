<script setup lang="ts">
import { iconAlias, iconAliasOverride, iconSource, isIconAlias } from '@alfakit/core'
import { computed, onMounted, type Component, type HTMLAttributes } from 'vue'
import { useOptionalRegistry } from '../context'
import { iconMap, markIconsMounted, resolveIcon } from './icons'
import { cn } from './utils'

/**
 * Renders an icon resolved by the server (`Icons::resolve()`): a Lucide name (`users`,
 * `shopping-cart`), an image URL or sanitised `<svg>` markup. `alfakit::` aliases use the
 * app's replacement (`Icons::register()`) or `fallback`. Unknown Lucide names render the
 * `fallback` icon (if any) or nothing. `fallback` may also be a statically imported glyph
 * (`:fallback="SearchIcon"`): renderer chrome uses it so an unreplaced alias draws at once,
 * without loading anything.
 */
const props = defineProps<{
  name?: string | null
  fallback?: string | Component | null
  class?: HTMLAttributes['class']
}>()

// `createAlfakit({ components: { 'panel:icon': MyIcon } })` renders every named icon with
// another icon set; it receives `name`, `fallback` and `class`.
const custom = useOptionalRegistry()?.resolve('panel:icon')
// Named icons render once the page has hydrated (the server render shows none).
onMounted(markIconsMounted)

const fallbackName = computed(() =>
  typeof props.fallback === 'string' ? props.fallback : undefined,
)
const glyph = computed(() =>
  props.fallback && typeof props.fallback !== 'string' ? props.fallback : null,
)

// Chrome icons (`<Icon name="alfakit::…" :fallback="SearchIcon" />`) draw their bundled glyph
// synchronously unless the app replaced the alias with `Icons::register()`.
const useGlyph = computed(
  () =>
    glyph.value !== null &&
    !!props.name &&
    isIconAlias(props.name) &&
    iconAliasOverride(props.name) === undefined,
)

const source = computed(() =>
  props.name && !useGlyph.value ? iconSource(iconAlias(props.name, fallbackName.value)) : null,
)

const component = computed(() => {
  if (source.value?.type !== 'name' || custom) return null

  const icons = iconMap()

  // Nothing until the icon map has loaded (and during the server render and hydration).
  if (!icons) return null

  return (
    resolveIcon(source.value.name, icons) ??
    glyph.value ??
    (fallbackName.value ? resolveIcon(fallbackName.value, icons) : null)
  )
})
</script>

<template>
  <component :is="glyph" v-if="useGlyph && glyph" :class="cn('size-4 shrink-0', props.class)" />
  <!-- Sanitised on the server (SvgSanitizer): drawing elements only. -->
  <!-- eslint-disable vue/no-v-html -->
  <span
    v-else-if="source?.type === 'svg'"
    aria-hidden="true"
    data-slot="icon"
    :class="cn('inline-flex size-4 shrink-0 [&>svg]:size-full', props.class)"
    v-html="source.svg"
  />
  <!-- eslint-enable vue/no-v-html -->
  <img
    v-else-if="source?.type === 'url'"
    :src="source.url"
    alt=""
    aria-hidden="true"
    data-slot="icon"
    :class="cn('size-4 shrink-0 object-contain', props.class)"
  />
  <component
    :is="custom"
    v-else-if="custom && source?.type === 'name'"
    :name="source.name"
    :fallback="fallbackName"
    :class="cn('size-4 shrink-0', props.class)"
  />
  <component :is="component" v-else-if="component" :class="cn('size-4 shrink-0', props.class)" />
</template>
