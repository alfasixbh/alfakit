<script setup lang="ts">
import type { BaseEntry, TextEntrySchema } from '@alfakit/core'
import { isolationDirection, limitedListItems } from '@alfakit/core'
import { CheckIcon, CopyIcon } from '@lucide/vue'
import { computed, ref, type HTMLAttributes } from 'vue'
import { badgeColorClasses, colorClass, textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Badge from '../ui/Badge.vue'
import EntryLink from './EntryLink.vue'
import { useT } from '../../context'

const SIZES: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
}
const WEIGHTS: Record<string, string> = {
  thin: 'font-thin',
  extralight: 'font-extralight',
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold',
  black: 'font-black',
}
const FAMILIES: Record<string, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
}

const props = defineProps<{
  value: unknown
  schema: Partial<TextEntrySchema>
  class?: HTMLAttributes['class']
}>()
const copied = ref(false)

const isEmpty = computed(
  () =>
    props.value === null ||
    props.value === undefined ||
    props.value === '' ||
    (Array.isArray(props.value) && props.value.length === 0),
)
const items = computed(() => (Array.isArray(props.value) ? props.value : [props.value]))
const isList = computed(() => items.value.length > 1 || Array.isArray(props.value))
// `expandableLimitedList()`: the items past `listLimit` show behind a toggle.
const expanded = ref(false)
const limited = computed(() => limitedListItems(items.value, props.schema, expanded.value))
const showToggle = computed(
  () =>
    limited.value.hidden > 0 ||
    (expanded.value && limitedListItems(items.value, props.schema, false).hidden > 0),
)

// Called with .prevent.stop: the entry may sit inside a link or a clickable table row.
const copy = (text: string) => {
  void navigator.clipboard?.writeText(text).then(() => {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, props.schema.copyMessageDuration ?? 1500)
  })
}

const itemClasses = computed(() =>
  cn(
    'inline-flex max-w-full items-center gap-1.5',
    props.schema.color && textColorClasses[props.schema.color],
    props.schema.size && SIZES[props.schema.size],
    props.schema.weight && WEIGHTS[props.schema.weight],
    props.schema.fontFamily && FAMILIES[props.schema.fontFamily],
  ),
)
// Lists of enums whose items differ carry a colour and icon per item.
const itemColor = (index: number) => props.schema.itemColors?.[index] ?? props.schema.color
const itemIcon = (index: number) => props.schema.itemIcons?.[index] ?? props.schema.icon
// Relationship lists (`tags.name` with a `url()` closure) link each item on its own.
const itemLink = (index: number) =>
  ({
    url: props.schema.itemUrls?.[index] ?? undefined,
    openUrlInNewTab: props.schema.openUrlInNewTab,
  }) as BaseEntry
const listItemClasses = (index: number) => {
  const color = itemColor(index)

  return cn(
    'inline-flex max-w-full items-center gap-1.5',
    color && textColorClasses[color],
    props.schema.size && SIZES[props.schema.size],
    props.schema.weight && WEIGHTS[props.schema.weight],
    props.schema.fontFamily && FAMILIES[props.schema.fontFamily],
  )
}
// `min-w-0 break-words`: a long value (a URL, a token) breaks inside its column instead of
// pushing the copy button and the icons past it.
const innerClasses = computed(() =>
  cn(
    'min-w-0 break-words',
    props.schema.lineClamp && `line-clamp-${props.schema.lineClamp}`,
    !props.schema.wrap && !props.schema.lineClamp && 'whitespace-pre-line',
  ),
)
const t = useT()
</script>

<template>
  <span v-if="isEmpty" class="text-muted-foreground">{{ props.schema.placeholder ?? '—' }}</span>
  <Icon
    v-else-if="props.schema.boolean"
    :name="props.value ? 'circle-check' : 'circle-x'"
    :class="cn('size-5', props.value ? 'text-success' : 'text-danger')"
  />
  <component
    :is="props.schema.listWithLineBreaks ? 'ul' : 'span'"
    v-else-if="isList"
    :class="
      cn(
        props.schema.listWithLineBreaks
          ? cn('flex flex-col gap-0.5', props.schema.bulleted && 'list-disc ps-4')
          : 'flex flex-wrap items-center gap-1',
        props.class,
      )
    "
  >
    <!-- A dynamic 'template' renders an inert <template> element, so inline lists use a
         display:contents span that doesn't affect the flex layout. -->
    <component
      :is="props.schema.listWithLineBreaks ? 'li' : 'span'"
      v-for="(item, index) in limited.items"
      :key="index"
      :class="props.schema.listWithLineBreaks ? undefined : 'contents'"
    >
      <EntryLink :entry="itemLink(index)">
        <Badge
          v-if="props.schema.badge"
          variant="outline"
          :class="colorClass(badgeColorClasses, itemColor(index), 'gray')"
        >
          <Icon
            v-if="itemIcon(index) && props.schema.iconPosition !== 'after'"
            :name="itemIcon(index)!"
            :class="cn(props.schema.iconColor && textColorClasses[props.schema.iconColor])"
          />
          <span
            v-if="props.schema.html"
            :class="cn('min-w-0 break-words', props.schema.prose && 'alfakit-prose')"
            v-html="String(item)"
          />
          <bdi v-else :dir="isolationDirection(String(item))" :class="innerClasses">{{
            String(item)
          }}</bdi>
          <Icon
            v-if="itemIcon(index) && props.schema.iconPosition === 'after'"
            :name="itemIcon(index)!"
          />
        </Badge>
        <span v-else :class="listItemClasses(index)">
          <Icon
            v-if="itemIcon(index) && props.schema.iconPosition !== 'after'"
            :name="itemIcon(index)!"
            :class="cn(props.schema.iconColor && textColorClasses[props.schema.iconColor])"
          />
          <span
            v-if="props.schema.html"
            :class="cn('min-w-0 break-words', props.schema.prose && 'alfakit-prose')"
            v-html="String(item)"
          />
          <bdi v-else :dir="isolationDirection(String(item))" :class="innerClasses">{{
            String(item)
          }}</bdi>
          <Icon
            v-if="itemIcon(index) && props.schema.iconPosition === 'after'"
            :name="itemIcon(index)!"
            :class="cn(props.schema.iconColor && textColorClasses[props.schema.iconColor])"
          />
          <button
            v-if="props.schema.copyable"
            type="button"
            class="text-muted-foreground hover:text-foreground shrink-0"
            :aria-label="t('copy', {}, 'Copy')"
            @click.prevent.stop="copy(String(item))"
          >
            <CheckIcon v-if="copied" class="size-3.5" />
            <CopyIcon v-else class="size-3.5" />
          </button>
          <span
            v-if="props.schema.copyable && copied"
            role="status"
            :class="cn('text-xs', !props.schema.copyMessage && 'sr-only')"
            >{{ props.schema.copyMessage ?? t('copied', {}, 'Copied') }}</span
          >
        </span>
      </EntryLink>
    </component>
    <component
      :is="props.schema.listWithLineBreaks ? 'li' : 'span'"
      v-if="showToggle"
      :class="props.schema.listWithLineBreaks ? 'list-none' : 'contents'"
    >
      <button
        type="button"
        data-slot="list-expand"
        :aria-expanded="expanded"
        class="text-primary text-xs hover:underline"
        @click.prevent.stop="expanded = !expanded"
      >
        {{
          expanded
            ? t('list.show_less', {}, 'Show less')
            : t('list.show_more', { count: limited.hidden }, `+${limited.hidden} more`)
        }}
      </button>
    </component>
  </component>
  <span v-else :class="props.class">
    <Badge
      v-if="props.schema.badge"
      variant="outline"
      :class="colorClass(badgeColorClasses, props.schema.color, 'gray')"
    >
      <Icon
        v-if="props.schema.icon && props.schema.iconPosition !== 'after'"
        :name="props.schema.icon"
        :class="cn(props.schema.iconColor && textColorClasses[props.schema.iconColor])"
      />
      <span
        v-if="props.schema.html"
        :class="cn('min-w-0 break-words', props.schema.prose && 'alfakit-prose')"
        v-html="String(items[0])"
      />
      <bdi v-else :dir="isolationDirection(String(items[0]))" :class="innerClasses">{{
        String(items[0])
      }}</bdi>
      <Icon
        v-if="props.schema.icon && props.schema.iconPosition === 'after'"
        :name="props.schema.icon"
      />
    </Badge>
    <span v-else :class="itemClasses">
      <Icon
        v-if="props.schema.icon && props.schema.iconPosition !== 'after'"
        :name="props.schema.icon"
        :class="cn(props.schema.iconColor && textColorClasses[props.schema.iconColor])"
      />
      <span
        v-if="props.schema.html"
        :class="cn('min-w-0 break-words', props.schema.prose && 'alfakit-prose')"
        v-html="String(items[0])"
      />
      <bdi v-else :dir="isolationDirection(String(items[0]))" :class="innerClasses">{{
        String(items[0])
      }}</bdi>
      <Icon
        v-if="props.schema.icon && props.schema.iconPosition === 'after'"
        :name="props.schema.icon"
        :class="cn(props.schema.iconColor && textColorClasses[props.schema.iconColor])"
      />
      <button
        v-if="props.schema.copyable"
        type="button"
        class="text-muted-foreground hover:text-foreground shrink-0"
        :aria-label="t('copy', {}, 'Copy')"
        @click.prevent.stop="copy(String(items[0]))"
      >
        <CheckIcon v-if="copied" class="size-3.5" />
        <CopyIcon v-else class="size-3.5" />
      </button>
      <span
        v-if="props.schema.copyable && copied"
        role="status"
        :class="cn('text-xs', !props.schema.copyMessage && 'sr-only')"
        >{{ props.schema.copyMessage ?? t('copied', {}, 'Copied') }}</span
      >
    </span>
  </span>
</template>
