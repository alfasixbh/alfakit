<script setup lang="ts">
import {
  applyDocumentLocale,
  applyPanelTheme,
  PANEL_TOAST_OFFSET,
  resolveToastPosition,
  type AlfakitPageProps,
} from '@alfakit/core'
import { usePage } from '@inertiajs/vue3'
import { ConfigProvider } from 'reka-ui'
import { computed, watch } from 'vue'
import ActionModals from './components/actions/ActionModals.vue'
import DevToolsSlot from './components/dev-tools/DevToolsSlot.vue'
import FlashToasts from './components/notifications/FlashToasts.vue'
import RealtimeNotifications from './components/notifications/RealtimeNotifications.vue'
import ImpersonationBanner from './components/panel/ImpersonationBanner.vue'
import PwaManager from './components/panel/PwaManager.vue'
import SchemaContractGuard from './components/panel/SchemaContractGuard.vue'
import Toaster from './components/ui/Toaster.vue'
import TooltipProvider from './components/ui/TooltipProvider.vue'
import { useAlfakit } from './context'

/**
 * Persistent layout rendered inside Inertia's page tree, so modals and toasts can read page
 * props through `usePage()`. It follows the current page: the reading direction for reka-ui
 * primitives, modals and toasts.
 */
/** Starter kit mode: Alfakit's toaster gets an id so the host's id-less one never doubles its toasts. */
defineProps<{ toasterId?: string }>()

const page = usePage<AlfakitPageProps>()
const { translator, registry } = useAlfakit()

// Replace with createAlfakit({ components: { 'panel:impersonation-banner': … } }).
const impersonationBanner = registry.resolve('panel:impersonation-banner') ?? ImpersonationBanner

const panel = computed(() => page.props.alfakit as AlfakitPageProps['alfakit'] | undefined)
const localization = computed(() => panel.value?.localization)
const direction = computed(() => localization.value?.direction ?? 'ltr')

// Every visit (including the redirect after a language switch, which is a POST + redirect
// and so not a plain navigation) may carry new strings: update the translator synchronously,
// before children re-render.
watch(
  () => [panel.value?.translations, localization.value?.tag] as const,
  ([translations, tag]) => {
    if (!panel.value) return

    translator.setTranslations(translations ?? {})
    translator.setLocale(tag ?? 'en')
  },
  { immediate: true, flush: 'sync' },
)

watch(localization, (value) => applyDocumentLocale(value), { immediate: true })
watch(panel, (value) => applyPanelTheme(value), { immediate: true })
</script>

<template>
  <ConfigProvider :dir="direction">
    <TooltipProvider :delay-duration="0">
      <SchemaContractGuard :panel="panel">
        <slot />
      </SchemaContractGuard>
      <ActionModals />
      <FlashToasts />
      <RealtimeNotifications />
      <!-- `Panel::pwa()`: service worker and the "new version" toast. -->
      <PwaManager />
      <!-- Schema inspector: renders (and loads its code) only with `alfakitDevTools`. -->
      <DevToolsSlot />
      <component
        :is="impersonationBanner"
        v-if="panel?.impersonation"
        :impersonation="panel.impersonation"
      />
      <Toaster
        :id="toasterId"
        :position="resolveToastPosition(panel?.toastPosition, direction)"
        :offset="PANEL_TOAST_OFFSET"
        :mobile-offset="PANEL_TOAST_OFFSET"
        :dir="direction"
        rich-colors
        close-button
      />
    </TooltipProvider>
  </ConfigProvider>
</template>
