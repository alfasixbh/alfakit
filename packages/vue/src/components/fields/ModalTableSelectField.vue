<script setup lang="ts">
import type { ModalTableSelectSchema } from '@alfakit/core'
import { fieldIds, modalTableSelected } from '@alfakit/core'
import { XIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useT } from '../../context'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Badge from '../ui/Badge.vue'
import Button from '../ui/Button.vue'
import { Icon } from '../../lib/icons'
import ModalTablePicker from './ModalTablePicker.vue'

/**
 * Select records from a table in a modal. The table (columns, search, filters, sorting,
 * pagination) comes from the server's picker endpoint; the field keeps only keys, with
 * labels from the server.
 */
const props = defineProps<{ component: ModalTableSelectSchema }>()
const t = useT()
const { value, setValue, error, id, disabled, readOnly, aria } = useField<unknown>(
  () => props.component,
)
const multiple = computed(() => Boolean(props.component.multiple))
const selected = computed(() => modalTableSelected(value.value, multiple.value))
const locked = computed(() => disabled.value || readOnly.value)
const open = ref(false)
const picked = ref<Record<string, string>>({})
const labels = computed(() => ({ ...picked.value, ...props.component.selectedLabels }))

const store = (keys: string[]) => setValue(multiple.value ? keys : (keys[0] ?? null))
const onConfirm = (keys: string[], newLabels: Record<string, string>) => {
  picked.value = { ...picked.value, ...newLabels }
  store(keys)
  open.value = false
}
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <div
      :id="id"
      role="group"
      data-slot="modal-table-select"
      class="flex flex-wrap items-center gap-2"
      :aria-labelledby="props.component.label ? fieldIds(id).label : undefined"
      :aria-describedby="aria['aria-describedby']"
    >
      <span v-if="selected.length === 0" class="text-muted-foreground text-sm">{{
        props.component.placeholder ?? t('table_select.none', {}, 'Nothing selected')
      }}</span>
      <Badge v-for="key in selected" v-else :key="key" variant="secondary" class="gap-1 pe-1">
        <span>{{ labels[key] ?? key }}</span>
        <button
          v-if="!locked"
          type="button"
          class="hover:bg-foreground/10 rounded-sm"
          :aria-label="t('table_select.remove', { label: labels[key] ?? key }, 'Remove :label')"
          @click="store(selected.filter((candidate) => candidate !== key))"
        >
          <XIcon class="size-3" />
        </button>
      </Badge>
      <Button
        v-if="!locked"
        type="button"
        variant="outline"
        size="sm"
        aria-haspopup="dialog"
        @click="open = true"
        ><Icon v-if="props.component.selectActionIcon" :name="props.component.selectActionIcon" />{{
          selected.length > 0 && !multiple
            ? t('table_select.change', {}, 'Change')
            : props.component.selectActionLabel
        }}</Button
      >
    </div>
    <ModalTablePicker
      v-if="open"
      :component="props.component"
      :initial="selected"
      @close="open = false"
      @confirm="onConfirm"
    />
  </FieldWrapper>
</template>
