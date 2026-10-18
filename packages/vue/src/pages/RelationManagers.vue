<script setup lang="ts">
import type { RelationManagersBlock } from '@alfakit/core'
import type { ContentBlock } from '@alfakit/core'
import {
  hasRelationManagerTabs,
  isLazyPlaceholder,
  RELATION_QUERY_KEY,
  relationManagerTabs,
  relationTabFromQuery,
  relationTabSlug,
} from '@alfakit/core'
import { usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import LazyPlaceholder from '../components/panel/LazyPlaceholder.vue'
import Slot from '../components/panel/Slot.vue'
import DataTable from '../components/table/DataTable.vue'
import Badge from '../components/ui/Badge.vue'
import ContentBlockRenderer from './ContentBlockRenderer.vue'
import Tabs from '../components/ui/Tabs.vue'
import TabsContent from '../components/ui/TabsContent.vue'
import TabsList from '../components/ui/TabsList.vue'
import TabsTrigger from '../components/ui/TabsTrigger.vue'
import { badgeColorClasses, colorClass } from '../lib/colors'
import { Icon } from '../lib/icons'
import { cn } from '../lib/utils'

const props = defineProps<{ block: RelationManagersBlock }>()
const tabs = computed(() => relationManagerTabs(props.block))
// `?relation=`: a key in `getRelations()` or a position. The page URL (not
// `window.location`) so the server renders the same tab as the browser.
const page = usePage()
const active = ref(
  relationTabFromQuery(
    tabs.value,
    new URL(page.url, 'http://localhost').searchParams.get(RELATION_QUERY_KEY),
  )?.key ??
    tabs.value[0]?.key ??
    '',
)

function changeTab(key: string) {
  active.value = key

  if (typeof window === 'undefined') return

  const next = new URL(window.location.href)
  const slug = relationTabSlug(tabs.value, key)

  if (slug === null) next.searchParams.delete(RELATION_QUERY_KEY)
  else next.searchParams.set(RELATION_QUERY_KEY, slug)

  window.history.replaceState(window.history.state, '', next)
}
const single = computed(() =>
  hasRelationManagerTabs(props.block) ? undefined : props.block.managers[0],
)
</script>

<template>
  <template v-if="props.block.managers.length === 0" />
  <section v-else-if="single" class="flex flex-col gap-3">
    <Slot name="resource.relation-manager.before" :scope="single.key" />
    <LazyPlaceholder v-if="isLazyPlaceholder(single)" variant="table" />
    <DataTable
      v-else
      :table="{ ...single.table, heading: single.table.heading ?? single.title }"
      :component="single.component"
    />
    <Slot name="resource.relation-manager.after" :scope="single.key" />
  </section>
  <Tabs v-else :model-value="active" @update:model-value="changeTab(String($event))">
    <TabsList>
      <Slot name="resource.tabs.start" />
      <TabsTrigger v-for="tab in tabs" :key="tab.key" :value="tab.key">
        <Icon v-if="tab.icon" :name="tab.icon" />
        {{ tab.title }}
        <Badge
          v-if="tab.badge !== undefined && tab.badge !== null && tab.badge !== ''"
          variant="secondary"
          :title="tab.badgeTooltip"
          :class="
            cn(
              'ms-1 px-1.5 py-0',
              tab.badgeColor && colorClass(badgeColorClasses, tab.badgeColor, 'gray'),
            )
          "
          >{{ tab.badge
          }}<span v-if="tab.badgeTooltip" class="sr-only">{{
            ` (${tab.badgeTooltip})`
          }}</span></Badge
        >
      </TabsTrigger>
      <Slot name="resource.tabs.end" />
    </TabsList>
    <TabsContent
      v-for="tab in tabs"
      :key="tab.key"
      :value="tab.key"
      class="flex flex-col gap-6 pt-2"
      :data-slot="tab.group ? 'relation-group' : tab.content ? 'relation-content' : undefined"
      :force-mount="tab.content ? true : undefined"
    >
      <!-- The page's form / infolist (`hasCombinedRelationManagerTabsWithContent()`), kept
           mounted so unsaved changes survive switching tabs. -->
      <ContentBlockRenderer v-if="tab.content" :block="tab.content as ContentBlock" />
      <template v-for="manager in tab.managers" :key="manager.key">
        <Slot name="resource.relation-manager.before" :scope="manager.key" />
        <LazyPlaceholder v-if="isLazyPlaceholder(manager)" variant="table" />
        <!-- Inside a group each table keeps its own heading; a lone manager's is the tab. -->
        <DataTable
          v-else
          :table="{
            ...manager.table,
            heading: tab.group ? (manager.table.heading ?? manager.title) : undefined,
          }"
          :component="manager.component"
        />
        <Slot name="resource.relation-manager.after" :scope="manager.key" />
      </template>
    </TabsContent>
  </Tabs>
</template>
