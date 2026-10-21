<script setup lang="ts">
import type { PageSchema } from '@alfakit/core'
import { applyBodyAttributes } from '@alfakit/core'
import { computed, onBeforeUnmount, watch } from 'vue'
import KeyboardShortcuts from '../components/panel/KeyboardShortcuts.vue'
import Slot from '../components/panel/Slot.vue'
import { useRegistry } from '../context'
import BlankLayout from '../layouts/BlankLayout.vue'
import SubNavigationLayout from '../components/panel/SubNavigationLayout.vue'
import ConflictBanner from '../components/realtime/ConflictBanner.vue'
import PageHeader from './PageHeader.vue'

const props = defineProps<{ page: PageSchema }>()
const registry = useRegistry()

// Each layout can be replaced: createAlfakit({ components: { 'layout:app': MyLayout } }).
// `createAlfakit()` registers the panel's layouts (`panelLayouts`), the starter kit its content
// layout; importing the panel layouts here would put the sidebar in every starter kit page.
const Auth = computed(() => registry.resolve('layout:auth') ?? BlankLayout)
const Blank = computed(() => registry.resolve('layout:blank') ?? BlankLayout)
const Fullscreen = computed(() => registry.resolve('layout:fullscreen') ?? BlankLayout)
const App = computed(() => registry.resolve('layout:app') ?? BlankLayout)
// Edit pages: somebody else saved the record (`detectConflicts()`, `Panel::realtime()`).
const Conflicts = computed(() => registry.resolve('page:conflict-banner') ?? ConflictBanner)

// The page's `$extraBodyAttributes` on `<body>` while it is open.
let undoBodyAttributes = () => {}
watch(
  () => JSON.stringify(props.page.extraBodyAttributes ?? null),
  () => {
    undoBodyAttributes()
    undoBodyAttributes = applyBodyAttributes(props.page.extraBodyAttributes)
  },
  { immediate: true },
)
onBeforeUnmount(() => undoBodyAttributes())
</script>

<template>
  <component
    :is="Auth"
    v-if="props.page.layout === 'auth'"
    :heading="props.page.heading ?? props.page.title"
    :subheading="props.page.subheading"
    :page="props.page"
  >
    <slot />
  </component>
  <component :is="Blank" v-else-if="props.page.layout === 'blank'" :page="props.page">
    <slot />
  </component>
  <component :is="Fullscreen" v-else-if="props.page.layout === 'fullscreen'" :page="props.page">
    <slot />
  </component>
  <component
    :is="App"
    v-else
    :breadcrumbs="props.page.breadcrumbs"
    :max-content-width="props.page.maxContentWidth"
    :page="props.page"
  >
    <!-- `?` overlay, `/`, `g d` and panel command shortcuts (`keyboardShortcuts()`). -->
    <KeyboardShortcuts />
    <Slot name="page.start" />
    <PageHeader :page="props.page" />
    <component :is="Conflicts" v-if="props.page.conflicts" :page="props.page" />
    <SubNavigationLayout v-if="props.page.subNavigation" :navigation="props.page.subNavigation">
      <slot />
    </SubNavigationLayout>
    <slot v-else />
    <Slot name="page.end" />
  </component>
</template>
