<script setup lang="ts">
import { isCustomSvgIcon, type IconPickerSchema } from '@alfakit/core'
import { computed } from 'vue'
import { useT } from '../../context'
import Icon from '../../lib/Icon.vue'
import { ICON_PICKER_SIZES } from './icon-picker-sizes'

/** The selected icon and its name (or the placeholder), inside the picker's trigger. */
const props = defineProps<{
  /** Named by the trigger's `aria-labelledby`, after the field label. */
  id: string
  component: IconPickerSchema
  value: string | null
  preview: string | null
}>()
const t = useT()
const size = computed(() => ICON_PICKER_SIZES[props.component.previewSize] ?? ICON_PICKER_SIZES.md)
</script>

<template>
  <span v-if="!props.value" :id="props.id" class="text-muted-foreground truncate">{{
    props.component.placeholder ?? t('form.icon_picker.placeholder', {}, 'Choose an icon')
  }}</span>
  <span v-else :id="props.id" data-slot="icon-picker-value" class="flex min-w-0 items-center gap-2">
    <Icon :name="props.preview ?? 'square-code'" :class="size.icon" />
    <span class="truncate">{{
      isCustomSvgIcon(props.value)
        ? t('form.icon_picker.custom_svg', {}, 'Custom SVG')
        : props.value
    }}</span>
  </span>
</template>
