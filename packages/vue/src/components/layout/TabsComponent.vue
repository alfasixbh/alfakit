<script setup lang="ts">
import type { TabsSchema } from '@alfakit/core'
import {
  componentHasErrors,
  readPersisted,
  schemaGapClass,
  tabFromQuery,
  tabQueryValue,
  tabToReveal,
  writePersisted,
} from '@alfakit/core'
import { usePage } from '@inertiajs/vue3'
import { computed, onMounted, ref, watch } from 'vue'
import { useStoreSelector } from '../../composables/use-store'
import { useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useOptionalFormStore } from '../form/form-context'
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
// The tab's readable value (`?tab=billing-address`), or its key in links from older versions.
const fromQuery = props.component.queryStringKey
  ? tabFromQuery(
      tabs.value,
      new URL(page.url, 'http://localhost').searchParams.get(props.component.queryStringKey),
    )
  : null
const active = ref<string>(
  fromQuery ??
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

// Tabs holding a field with a validation error are marked, and when a submit brings new
// errors while the open tab has none, the first tab with an error opens.
const TAB_INVALID_CLASSES =
  'text-destructive data-[state=active]:text-destructive dark:text-destructive dark:data-[state=active]:text-destructive'
const t = useT()
const store = useOptionalFormStore()
const errors = useStoreSelector(
  store?.store ?? {
    get: () => ({ errors: {} as Record<string, string[]> }),
    subscribe: () => () => {},
  },
  (state) => state.errors,
)
const invalidTabs = computed(
  () =>
    new Set(
      tabs.value.filter((tab) => componentHasErrors(tab, errors.value)).map((tab) => tab.key),
    ),
)

watch(
  errors,
  (next, previous) => {
    const reveal = tabToReveal(tabs.value, active.value, previous ?? {}, next)

    if (reveal !== null) active.value = reveal
  },
  { immediate: true },
)

function changeTab(value: string) {
  active.value = value

  const persist = props.component.persistTab

  if (persist) writePersisted(persist.key, value, persist.storage)
}

watch(
  active,
  (value) => {
    if (!props.component.queryStringKey || typeof window === 'undefined') return

    const tab = tabs.value.find((item) => item.key === value)
    const url = new URL(window.location.href)
    url.searchParams.set(props.component.queryStringKey, tab ? tabQueryValue(tab) : value)
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
      <TabsTrigger
        v-for="tab in tabs"
        :key="tab.key"
        :value="tab.key"
        :data-invalid="invalidTabs.has(tab.key) || undefined"
        :class="invalidTabs.has(tab.key) ? TAB_INVALID_CLASSES : undefined"
      >
        <Icon v-if="tab.icon && tab.iconPosition !== 'after'" :name="tab.icon" />
        {{ tab.label }}
        <Icon v-if="tab.icon && tab.iconPosition === 'after'" :name="tab.icon" />
        <TabBadge :tab="tab" />
        <template v-if="invalidTabs.has(tab.key)">
          <span aria-hidden="true" class="bg-destructive size-1.5 shrink-0 rounded-full"></span>
          <span class="sr-only">({{ t('translatable.has_errors') }})</span>
        </template>
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
