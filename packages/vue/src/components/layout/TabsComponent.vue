<script setup lang="ts">
import type { TabsSchema } from '@alfakit/core'
import { readPersisted, schemaGapClass, writePersisted } from '@alfakit/core'
import { usePage } from '@inertiajs/vue3'
import { computed, onMounted, ref, watch } from 'vue'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import SchemaRenderer from '../schema/SchemaRenderer.vue'
import Tabs from '../ui/Tabs.vue'
import TabsContent from '../ui/TabsContent.vue'
import TabsList from '../ui/TabsList.vue'
import TabsTrigger from '../ui/TabsTrigger.vue'
import DeferredSchema from './DeferredSchema.vue'
import TabBadge from './TabBadge.vue'

const props = defineProps<{ component: TabsSchema }>()
const tabs = computed(() => props.component.schema ?? [])
// The page URL (not `window.location`) so the server renders the same tab as the browser.
const page = usePage()
const fromQuery = props.component.queryStringKey
  ? new URL(page.url, 'http://localhost').searchParams.get(props.component.queryStringKey)
  : null
const active = ref<string>(
  tabs.value.find((tab) => tab.key === fromQuery)?.key ??
    tabs.value[Math.max(0, props.component.activeTab - 1)]?.key ??
    tabs.value[0]?.key ??
    '',
)

// `persistTab()`: restored after mounting (the server can't read browser storage); a tab
// named in the query string wins.
onMounted(() => {
  const persist = props.component.persistTab

  if (!persist || fromQuery) return

  const stored = readPersisted(persist.key, persist.storage)

  if (stored && tabs.value.some((tab) => tab.key === stored)) active.value = stored
})

function changeTab(value: string) {
  active.value = value

  const persist = props.component.persistTab

  if (persist) writePersisted(persist.key, value, persist.storage)
}

watch(
  active,
  (value) => {
    if (!props.component.queryStringKey || typeof window === 'undefined') return

    const url = new URL(window.location.href)
    url.searchParams.set(props.component.queryStringKey, value)
    window.history.replaceState(window.history.state, '', url)
  },
  { immediate: true },
)
</script>

<template>
  <Tabs
    :data-surface="props.component.contained ? 'tabs' : undefined"
    :model-value="active"
    :orientation="props.component.vertical ? 'vertical' : 'horizontal'"
    :class="
      cn(
        props.component.contained && 'bg-card rounded-xl border shadow-xs',
        props.component.vertical && 'flex-row',
      )
    "
    v-bind="props.component.extraAttributes"
    @update:model-value="changeTab(String($event))"
  >
    <TabsList
      :data-scrollable="props.component.scrollable === false ? 'false' : undefined"
      :class="
        cn(
          props.component.contained && 'm-2',
          props.component.vertical
            ? 'self-start'
            : props.component.scrollable === false
              ? 'h-auto max-w-full flex-wrap justify-start'
              : 'relative max-w-full overflow-x-auto',
        )
      "
    >
      <TabsTrigger v-for="tab in tabs" :key="tab.key" :value="tab.key">
        <Icon v-if="tab.icon && tab.iconPosition !== 'after'" :name="tab.icon" />
        {{ tab.label }}
        <Icon v-if="tab.icon && tab.iconPosition === 'after'" :name="tab.icon" />
        <TabBadge :tab="tab" />
      </TabsTrigger>
    </TabsList>
    <TabsContent
      v-for="tab in tabs"
      :key="tab.key"
      :value="tab.key"
      force-mount
      :class="cn('data-[state=inactive]:hidden', props.component.contained ? 'p-6 pt-4' : 'pt-4')"
    >
      <DeferredSchema v-slot="{ component: loaded }" :component="tab">
        <SchemaRenderer
          :components="loaded.schema ?? []"
          :columns="loaded.columns"
          :attributes="loaded.extraAttributes"
          :class="schemaGapClass(loaded) || undefined"
        />
      </DeferredSchema>
    </TabsContent>
  </Tabs>
</template>
