<script setup lang="ts">
import type {
  ActionContext,
  ActionSchema,
  AnyActionSchema,
  ColumnSchema,
  TableRecordSchema,
} from '@alfakit/core'
import { Link } from '@inertiajs/vue3'
import { computed } from 'vue'
import { useActionRunner, useT } from '../../context'
import TableCellContent from './TableCellContent.vue'

/**
 * A record's cell content wrapped in its link: the column `url()`, the column `action()`,
 * or (for the primary cell of a clickable record) the record URL or record action. Used by
 * content layouts.
 */
const props = defineProps<{
  column: ColumnSchema
  record: TableRecordSchema
  token: string
  component: string
  context: ActionContext
  clickable: boolean
  primary: boolean
  hasRecordAction: boolean
}>()
const emit = defineEmits<{ recordClick: [record: TableRecordSchema] }>()
const t = useT()
const runner = useActionRunner()
const cell = computed(() => props.record.cells[props.column.name] ?? {})
const focusRing = 'focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-[3px]'

const runCellAction = () => {
  const action = (props.record.actions ?? [])
    .flatMap((item: AnyActionSchema) => ('actions' in item ? item.actions : [item]))
    .find((item): item is ActionSchema => 'name' in item && item.name === cell.value.action)

  if (action) void runner.trigger(action, { ...props.context, record: props.record.key })
}
</script>

<template>
  <template v-if="cell.url">
    <a
      v-if="cell.openUrlInNewTab"
      :href="cell.url"
      target="_blank"
      rel="noopener noreferrer"
      class="hover:underline"
      @click.stop
    >
      <TableCellContent
        :column="props.column"
        :cell="cell"
        :record-key="props.record.key"
        :token="props.token"
        :component="props.component"
      />
      <span class="sr-only"> {{ t('opens_in_new_tab', {}, '(opens in a new tab)') }}</span>
    </a>
    <Link v-else :href="cell.url" class="hover:underline" @click.stop>
      <TableCellContent
        :column="props.column"
        :cell="cell"
        :record-key="props.record.key"
        :token="props.token"
        :component="props.component"
      />
    </Link>
  </template>
  <button
    v-else-if="cell.action && props.record.actions"
    type="button"
    class="text-start hover:underline"
    @click.stop="runCellAction"
  >
    <TableCellContent
      :column="props.column"
      :cell="cell"
      :record-key="props.record.key"
      :token="props.token"
      :component="props.component"
    />
  </button>
  <template v-else-if="props.clickable && props.primary">
    <button
      v-if="props.hasRecordAction || !props.record.url"
      type="button"
      :class="[focusRing, 'text-start']"
      @click.stop="emit('recordClick', props.record)"
    >
      <TableCellContent
        :column="props.column"
        :cell="cell"
        :record-key="props.record.key"
        :token="props.token"
        :component="props.component"
      />
    </button>
    <a
      v-else-if="props.record.openUrlInNewTab"
      :href="props.record.url"
      target="_blank"
      rel="noopener noreferrer"
      :class="focusRing"
      @click.stop
    >
      <TableCellContent
        :column="props.column"
        :cell="cell"
        :record-key="props.record.key"
        :token="props.token"
        :component="props.component"
      />
      <span class="sr-only"> {{ t('opens_in_new_tab', {}, '(opens in a new tab)') }}</span>
    </a>
    <Link v-else :href="props.record.url ?? '#'" :class="focusRing" @click.stop>
      <TableCellContent
        :column="props.column"
        :cell="cell"
        :record-key="props.record.key"
        :token="props.token"
        :component="props.component"
      />
    </Link>
  </template>
  <TableCellContent
    v-else
    :column="props.column"
    :cell="cell"
    :record-key="props.record.key"
    :token="props.token"
    :component="props.component"
  />
</template>
