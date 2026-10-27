<script setup lang="ts">
import type { PageSchema } from '@alfakit/core'
import { applyBodyAttributes } from '@alfakit/core'
import { computed, defineComponent, inject, onBeforeUnmount, watch } from 'vue'
import KeyboardShortcuts from '../components/panel/KeyboardShortcuts.vue'
import Slot from '../components/panel/Slot.vue'
import { useRegistry } from '../context'
import SubNavigationLayout from '../components/panel/SubNavigationLayout.vue'
import ConflictBanner from '../components/realtime/ConflictBanner.vue'
import { HOSTED_LAYOUT, layoutKind } from './hosted-layout'
import PageHeader from './PageHeader.vue'
import PanelLayout from './PanelLayout.vue'

const props = defineProps<{ page: PageSchema }>()
const registry = useRegistry()

// Edit pages: somebody else saved the record (`detectConflicts()`, `Panel::realtime()`).
const Conflicts = computed(() => registry.resolve('page:conflict-banner') ?? ConflictBanner)

const kind = computed(() => layoutKind(props.page))
// The persistent layout around the page (`PanelLayoutHost`) already draws this layout.
const hosted = inject(HOSTED_LAYOUT, null)
const Passthrough = defineComponent({
  props: { page: { type: Object, default: undefined } },
  setup:
    (_, { slots }) =>
    () =>
      slots.default?.(),
})
const Wrapper = computed(() => (hosted?.value === kind.value ? Passthrough : PanelLayout))

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
  <component :is="Wrapper" :page="props.page">
    <template v-if="kind === 'app'">
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
    </template>
    <slot v-else />
  </component>
</template>
