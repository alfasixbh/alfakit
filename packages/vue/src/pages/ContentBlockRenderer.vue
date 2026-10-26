<script setup lang="ts">
import type {
  ContentBlock,
  FormBlock as FormBlockSchema,
  InfolistBlock,
  LinksBlock,
  RelationManagersBlock,
  SchemaBlock,
  TableBlock,
  WidgetsBlock,
} from '@alfakit/core'
import { Link } from '@inertiajs/vue3'
import { listTabIds } from '@alfakit/core'
import { computed, useId } from 'vue'
import FormBlock from '../components/form/FormBlock.vue'
import SchemaRenderer from '../components/schema/SchemaRenderer.vue'
import DataTable from '../components/table/DataTable.vue'
import ListTabs from '../components/table/ListTabs.vue'
import WidgetGrid from '../components/widgets/WidgetGrid.vue'
import Slot from '../components/panel/Slot.vue'
import { useAlfakit } from '../context'
import RelationManagers from './RelationManagers.vue'

const props = defineProps<{ block: ContentBlock }>()
const { registry } = useAlfakit()
const custom = computed(() => registry.resolve(props.block.type))
// The page's main table: the server sends its slots on List / ManageRelatedRecords pages only.
// Links list tabs to the table they control.
const tabsIdBase = `alfakit-list-tabs-${(useId() ?? '').replace(/[^A-Za-z0-9_-]/g, '')}`
const tabPanelIds = computed(() =>
  listTabIds(tabsIdBase, (props.block as TableBlock).activeTab ?? ''),
)
const mainTable = computed(() => props.block.type === 'Table' && props.block.key === 'table')
</script>

<template>
  <FormBlock v-if="props.block.type === 'Form'" :block="props.block as FormBlockSchema" />
  <div v-else-if="props.block.type === 'Infolist'" data-slot="infolist" class="contents">
    <SchemaRenderer
      :components="(props.block as InfolistBlock).components"
      :columns="(props.block as InfolistBlock).columns ?? { default: 1, lg: 2 }"
    />
  </div>
  <SchemaRenderer
    v-else-if="props.block.type === 'Schema'"
    :components="(props.block as SchemaBlock).components"
    :columns="{ default: 1 }"
  />
  <template v-else-if="props.block.type === 'Table'">
    <template v-if="mainTable">
      <Slot name="resource.list-records.table.before" />
      <Slot name="resource.manage-related-records.table.before" />
    </template>
    <div v-if="(props.block as TableBlock).tabs?.length" class="flex flex-col gap-4">
      <ListTabs
        :tabs="(props.block as TableBlock).tabs ?? []"
        :active-tab="(props.block as TableBlock).activeTab"
        :tabs-query-key="(props.block as TableBlock).tabsQueryKey"
        :label="(props.block as TableBlock).pluralModelLabel"
        :id-base="tabsIdBase"
      />
      <div
        data-slot="list-tabs-panel"
        role="tabpanel"
        :id="tabPanelIds.panel"
        :aria-labelledby="(props.block as TableBlock).activeTab ? tabPanelIds.tab : undefined"
      >
        <DataTable
          :table="props.block as TableBlock"
          :component="(props.block as TableBlock).component"
        />
      </div>
    </div>
    <DataTable
      v-else
      :table="props.block as TableBlock"
      :component="(props.block as TableBlock).component"
    />
    <template v-if="mainTable">
      <Slot name="resource.manage-related-records.table.after" />
      <Slot name="resource.list-records.table.after" />
    </template>
  </template>
  <RelationManagers
    v-else-if="props.block.type === 'RelationManagers'"
    :block="props.block as RelationManagersBlock"
  />
  <template v-else-if="props.block.type === 'Widgets'">
    <Slot v-if="props.block.key === 'headerWidgets'" name="page.header-widgets.before" />
    <Slot v-if="props.block.key === 'footerWidgets'" name="page.footer-widgets.before" />
    <WidgetGrid :block="props.block as WidgetsBlock" />
    <Slot v-if="props.block.key === 'headerWidgets'" name="page.header-widgets.after" />
    <Slot v-if="props.block.key === 'footerWidgets'" name="page.footer-widgets.after" />
  </template>
  <div
    v-else-if="props.block.type === 'Links'"
    class="flex flex-col items-center gap-1 text-center text-sm"
  >
    <Link
      v-for="link in (props.block as LinksBlock).links"
      :key="link.url"
      :href="link.url"
      class="text-primary underline-offset-4 hover:underline"
      >{{ link.label }}</Link
    >
  </div>
  <component :is="custom" v-else-if="custom" :block="props.block" />
</template>
