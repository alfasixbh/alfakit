<script setup lang="ts">
import {
  isAlfakitPage,
  overlayPlacementDirection,
  resolveToastPosition,
  STARTER_KIT_TOASTER_ID,
  starterKitWidgetsPage,
  type PanelSchema,
} from '@alfakit/core'
import { usePage } from '@inertiajs/vue3'
import { ConfigProvider } from 'reka-ui'
import { computed, onMounted, onUnmounted, ref, toRef, watch } from 'vue'
import { setToasterId } from '../../components/notifications/flash-toasts'
import Toaster from '../../components/ui/Toaster.vue'
import TooltipProvider from '../../components/ui/TooltipProvider.vue'
import { provideAlfakit, provideStandalone } from '../../context'
import { ensureFlashToasts } from '../../standalone/runtime'
import { claimToaster, hasToaster } from '../../standalone/toaster-claims'
import { widgetsAlfakitContext } from './use-widgets'

/**
 * The context of a loaded header component: the panel data as the `alfakit` prop of a
 * panel page (`usePanel()`), the panel's translations and reading direction.
 */
const props = defineProps<{ panel: PanelSchema }>()

const context = widgetsAlfakitContext()
const page = computed(() => starterKitWidgetsPage())

provideAlfakit(context)
provideStandalone({ panel: toRef(props, 'panel'), page })

watch(
  () => [props.panel.translations, props.panel.localization?.tag] as const,
  ([translations, tag]) => {
    context.translator.setTranslations(translations ?? {})
    context.translator.setLocale(tag ?? 'en')
  },
  { immediate: true, flush: 'sync' },
)

/**
 * On the host's own pages no AlfaKit toaster is mounted, so the first loaded header
 * component renders one: the push toggle's and the PWA's messages show there too (W-S1-03).
 * AlfaKit pages (`AlfakitRoot`) and standalone components claim it themselves; the check
 * runs after every component mounted, and again after each visit.
 */
const inertiaPage = usePage()
const alfakitPage = computed(() => isAlfakitPage(inertiaPage.props))
const ownsToaster = ref(false)
const placement = computed(() =>
  overlayPlacementDirection(props.panel.localization?.direction ?? 'ltr', true),
)
let releaseToaster: (() => void) | null = null
let check = 0

function releaseHostToaster(): void {
  check++

  if (releaseToaster) {
    releaseToaster()
    setToasterId(undefined)
  }

  releaseToaster = null
  ownsToaster.value = false
}

function claimHostToaster(): void {
  releaseHostToaster()

  if (alfakitPage.value) return

  const current = check

  queueMicrotask(() => {
    if (current !== check || hasToaster()) return

    releaseToaster = claimToaster()
    ownsToaster.value = true
    // As `<AlfakitToaster>`: Alfakit's toasts and flashed notifications go to this one.
    setToasterId(STARTER_KIT_TOASTER_ID)
    ensureFlashToasts(context.registry)
  })
}

onMounted(() => {
  claimHostToaster()
  watch(alfakitPage, claimHostToaster)
})

onUnmounted(releaseHostToaster)
</script>

<template>
  <ConfigProvider :dir="props.panel.localization?.direction ?? 'ltr'">
    <TooltipProvider :delay-duration="0">
      <slot />
    </TooltipProvider>
  </ConfigProvider>
  <!-- In the body, not in the header (a header with a backdrop filter would hold its fixed
       position), placed in the document's direction as on AlfaKit pages. -->
  <Teleport v-if="ownsToaster" to="body">
    <Toaster
      :id="STARTER_KIT_TOASTER_ID"
      :position="resolveToastPosition(props.panel.toastPosition, placement)"
      :dir="placement"
      rich-colors
      close-button
    />
  </Teleport>
</template>
