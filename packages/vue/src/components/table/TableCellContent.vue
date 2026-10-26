<script setup lang="ts">
import type { ColorColumnSchema, IconColumnSchema } from '@alfakit/core'
import {
  columnRegistryKey,
  remainingTextSizeClass,
  stackedImageStyle,
  usesDefaultImageStack,
} from '@alfakit/core'
import { CheckIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useRegistry, useT } from '../../context'
import { colorClass, iconSizeClasses, textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import FormattedText from '../entries/FormattedText.vue'
import BooleanCell from './BooleanCell.vue'
import type { CellProps } from './cell-update'
import SelectCell from './SelectCell.vue'
import SelectComboboxCell from './SelectComboboxCell.vue'
import TextInputCell from './TextInputCell.vue'

const props = defineProps<CellProps>()
const registry = useRegistry()
// A component registered as `column:<type>` replaces the built-in cell renderer.
const custom = computed(() =>
  props.fromRegistry ? undefined : registry.resolve(columnRegistryKey(props.column)),
)
const t = useT()
// `ViewColumn`: the application component registered under the column's `view()` name.
const viewName = computed(() => (props.column as { component?: string }).component ?? '')
const view = computed(() =>
  props.column.type === 'ViewColumn' && viewName.value
    ? registry.resolve(viewName.value)
    : undefined,
)

const imageSchema = computed(
  () =>
    props.column as {
      circular?: boolean
      square?: boolean
      size?: number | string
      height?: number | string
      width?: string
      stacked?: boolean
      limit?: number
      limitedRemainingText?: boolean
      limitedRemainingTextSize?: string
      wrap?: boolean
      ring?: number
      overlap?: number
    },
)
const defaultImageStack = computed(() => usesDefaultImageStack(imageSchema.value))
const imageUrls = computed(() =>
  Array.isArray(props.cell.state) ? (props.cell.state as string[]) : [],
)
const imageLimit = computed(() => imageSchema.value.limit ?? imageUrls.value.length)
const toCss = (value: number | string | undefined) =>
  typeof value === 'number' ? `${value}px` : value
const imageStyle = computed(() => {
  const size = imageSchema.value.size ?? 40

  return {
    height: toCss(imageSchema.value.height ?? size),
    width: toCss(
      imageSchema.value.width ??
        (imageSchema.value.square || imageSchema.value.circular ? size : undefined),
    ),
  }
})
const colors = computed(() =>
  Array.isArray(props.cell.state)
    ? (props.cell.state as string[])
    : props.cell.state
      ? [String(props.cell.state)]
      : [],
)
const colorSchema = computed(() => props.column as ColorColumnSchema)
const copiedColor = ref<string | null>(null)
const copyColor = (color: string) => {
  void navigator.clipboard?.writeText(color).then(() => {
    copiedColor.value = color
    setTimeout(() => {
      copiedColor.value = null
    }, colorSchema.value.copyMessageDuration ?? 1500)
  })
}
const textSchema = computed(() => ({
  ...(props.column as object),
  color: props.cell.color,
  icon: props.cell.icon,
  iconPosition: props.cell.iconPosition,
  iconColor: props.cell.iconColor,
  itemColors: props.cell.itemColors,
  itemIcons: props.cell.itemIcons,
  itemUrls: props.cell.itemUrls,
}))
// `SelectColumn::native(false)` renders a combobox.
const isComboboxSelect = computed(
  () =>
    props.column.type === 'SelectColumn' && (props.column as { native?: boolean }).native === false,
)
const descriptionPosition = computed(
  () =>
    (props.column as { descriptionPosition?: 'above' | 'below' }).descriptionPosition ?? 'below',
)
</script>

<template>
  <component :is="custom" v-if="custom" v-bind="props" :from-registry="true" />
  <component
    :is="view"
    v-else-if="view"
    v-bind="{ ...(props.cell.props ?? {}), state: props.cell.state, ...props }"
  />
  <span v-else-if="props.column.type === 'ViewColumn'" class="text-destructive text-xs">{{
    t(
      'component_not_registered',
      { component: viewName },
      `Component ${viewName} is not registered.`,
    )
  }}</span>
  <template v-else-if="props.column.type === 'IconColumn'">
    <!-- A list state: one icon per item (`wrap()` lets them wrap). -->
    <div
      v-if="props.cell.icons"
      data-slot="icon-column-icons"
      :class="
        cn(
          'flex items-center gap-1.5',
          (props.column as IconColumnSchema).wrap ? 'flex-wrap' : 'flex-nowrap',
        )
      "
    >
      <span v-if="props.cell.icons.length === 0" class="text-muted-foreground">—</span>
      <Icon
        v-for="(item, index) in props.cell.icons"
        :key="index"
        :name="item.icon"
        :class="
          cn(
            colorClass(iconSizeClasses, props.cell.size, 'md'),
            item.color && textColorClasses[item.color],
          )
        "
      />
    </div>
    <Icon
      v-else-if="props.cell.icon"
      :name="props.cell.icon"
      :class="
        cn(
          colorClass(iconSizeClasses, props.cell.size, 'md'),
          props.cell.color && textColorClasses[props.cell.color],
        )
      "
    />
    <span v-else class="text-muted-foreground">—</span>
  </template>
  <template v-else-if="props.column.type === 'ImageColumn'">
    <span v-if="imageUrls.length === 0" class="text-muted-foreground">—</span>
    <div
      v-else
      :class="
        cn(
          'flex items-center',
          imageSchema.wrap && 'flex-wrap',
          imageSchema.stacked ? defaultImageStack && '-space-x-2' : 'gap-1.5',
          imageSchema.wrap && imageSchema.stacked && 'gap-y-1.5',
        )
      "
    >
      <img
        v-for="(url, index) in imageUrls.slice(0, imageLimit)"
        :key="index"
        :src="url"
        :alt="props.cell.alt ?? (index === 0 ? (props.column.label ?? '') : '')"
        :style="[imageStyle, stackedImageStyle(index, imageSchema)]"
        :class="
          cn(
            'object-cover',
            imageSchema.circular ? 'rounded-full' : 'rounded-md',
            imageSchema.stacked && defaultImageStack && 'ring-background ring-2',
          )
        "
        v-bind="props.cell.extraImgAttributes"
      />
      <span
        v-if="imageSchema.limitedRemainingText && imageUrls.length > imageLimit"
        data-slot="image-remaining"
        :class="
          cn(
            'text-muted-foreground',
            // The last image keeps the stack's negative end margin (W-S3-03).
            imageSchema.stacked && defaultImageStack ? 'ms-3' : 'ms-1',
            remainingTextSizeClass(imageSchema.limitedRemainingTextSize),
          )
        "
        >+{{ imageUrls.length - imageLimit }}</span
      >
    </div>
  </template>
  <template v-else-if="props.column.type === 'ColorColumn'">
    <span v-if="colors.length === 0" class="text-muted-foreground">—</span>
    <div
      v-else
      :class="cn('flex items-center gap-1.5', colorSchema.wrap ? 'flex-wrap' : 'flex-nowrap')"
    >
      <template v-for="color in colors" :key="color">
        <!-- The cell may sit inside a link or a clickable row. -->
        <button
          v-if="colorSchema.copyable"
          type="button"
          data-slot="color-copy"
          :title="color"
          :aria-label="`${t('copy', {}, 'Copy')} ${color}`"
          class="focus-visible:ring-ring/50 inline-flex rounded outline-none focus-visible:ring-[3px]"
          @click.prevent.stop="copyColor(color)"
        >
          <span
            class="inline-flex size-5 items-center justify-center rounded border shadow-xs"
            :style="{ backgroundColor: color }"
          >
            <CheckIcon
              v-if="copiedColor === color"
              class="size-3 text-white mix-blend-difference"
            />
          </span>
        </button>
        <span
          v-else
          :title="color"
          class="size-5 rounded border shadow-xs"
          :style="{ backgroundColor: color }"
        />
      </template>
      <span
        v-if="colorSchema.copyable && copiedColor"
        role="status"
        :class="cn('text-xs', !colorSchema.copyMessage && 'sr-only')"
        >{{ colorSchema.copyMessage ?? t('copied', {}, 'Copied') }}</span
      >
    </div>
  </template>
  <BooleanCell
    v-else-if="props.column.type === 'ToggleColumn' || props.column.type === 'CheckboxColumn'"
    v-bind="props"
  />
  <SelectComboboxCell v-else-if="isComboboxSelect" v-bind="props" />
  <SelectCell v-else-if="props.column.type === 'SelectColumn'" v-bind="props" />
  <TextInputCell v-else-if="props.column.type === 'TextInputColumn'" v-bind="props" />
  <div v-else class="flex flex-col gap-0.5">
    <span
      v-if="props.cell.description && descriptionPosition === 'above'"
      class="text-muted-foreground block text-xs"
      >{{ props.cell.description }}</span
    >
    <FormattedText :value="props.cell.state" :schema="textSchema" />
    <span
      v-if="props.cell.description && descriptionPosition === 'below'"
      class="text-muted-foreground block text-xs"
      >{{ props.cell.description }}</span
    >
  </div>
</template>
