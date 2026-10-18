<script setup lang="ts">
import { starterKitWidgetsPage, type PanelSchema } from '@alfakit/core'
import { ConfigProvider } from 'reka-ui'
import { computed, toRef, watch } from 'vue'
import TooltipProvider from '../../components/ui/TooltipProvider.vue'
import { provideAlfakit, provideStandalone } from '../../context'
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
</script>

<template>
  <ConfigProvider :dir="props.panel.localization?.direction ?? 'ltr'">
    <TooltipProvider :delay-duration="0">
      <slot />
    </TooltipProvider>
  </ConfigProvider>
</template>
