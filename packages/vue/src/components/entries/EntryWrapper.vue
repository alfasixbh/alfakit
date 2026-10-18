<script setup lang="ts">
import type { BaseEntry } from '@alfakit/core'
import { hasSlots } from '@alfakit/core'
import { computed, useId, type HTMLAttributes } from 'vue'
import { textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Tooltip from '../ui/Tooltip.vue'
import TooltipContent from '../ui/TooltipContent.vue'
import TooltipTrigger from '../ui/TooltipTrigger.vue'
import ContentSlot from '../schema/ContentSlot.vue'
import FieldAffixActions from '../schema/FieldAffixActions.vue'
import FieldHintActions from '../schema/FieldHintActions.vue'

const props = defineProps<{ entry: BaseEntry; class?: HTMLAttributes['class'] }>()
const labelId = `${useId()}-label`
// `extraEntryWrapperAttributes()` go on the wrapper, `extraAttributes()` on the value.
const wrapperAttributes = computed(() => props.entry.extraEntryWrapperAttributes)
/** `alignment()`: text and inline content (badges, icons, images) follow it. */
const ENTRY_ALIGNMENT: Record<string, string> = {
  start: 'text-start [&>*]:justify-start',
  center: 'text-center [&>*]:mx-auto [&>*]:justify-center',
  end: 'text-end [&>*]:ms-auto [&>*]:justify-end',
  justify: 'text-justify',
  between: 'text-justify',
}
// `afterLabel()` sits with the hint at the end of the label row unless aligned to the start.
const afterLabelAtStart = computed(() => props.entry.slots?.afterLabel?.alignment === 'start')
const hasLabelLine = computed(
  () =>
    Boolean(props.entry.label) ||
    Boolean(props.entry.slots?.beforeLabel) ||
    (Boolean(props.entry.slots?.afterLabel) && afterLabelAtStart.value),
)
const hasHint = computed(
  () =>
    Boolean(props.entry.hint) ||
    Boolean(props.entry.hintActions?.length) ||
    (Boolean(props.entry.slots?.afterLabel) && !afterLabelAtStart.value),
)
const hasSideSlots = computed(() => hasSlots(props.entry, ['beforeContent', 'afterContent']))
</script>

<template>
  <div
    data-slot="entry"
    role="group"
    :aria-labelledby="props.entry.label ? labelId : undefined"
    :data-inline-label="props.entry.inlineLabel ? '' : undefined"
    :class="
      cn(
        'flex flex-col gap-1',
        props.entry.inlineLabel && 'sm:grid sm:grid-cols-3 sm:items-start sm:gap-x-4',
        props.class,
      )
    "
    v-bind="wrapperAttributes"
  >
    <ContentSlot
      v-if="props.entry.slots?.aboveLabel && !props.entry.inlineLabel"
      :component="props.entry"
      name="aboveLabel"
    />
    <!-- `inlineLabel()`: label beside the value from sm up, stacked on phones. -->
    <div
      v-if="props.entry.inlineLabel || hasLabelLine || hasHint"
      :class="
        props.entry.inlineLabel ? 'flex flex-col gap-1' : 'flex items-center justify-between gap-2'
      "
    >
      <ContentSlot
        v-if="props.entry.slots?.aboveLabel && props.entry.inlineLabel"
        :component="props.entry"
        name="aboveLabel"
      />
      <span v-if="hasLabelLine" class="inline-flex min-w-0 items-center gap-2">
        <ContentSlot
          v-if="props.entry.slots?.beforeLabel"
          :component="props.entry"
          name="beforeLabel"
        />
        <span
          v-if="props.entry.label"
          :id="labelId"
          data-slot="entry-label"
          class="text-muted-foreground text-sm font-medium"
        >
          {{ props.entry.label }}
        </span>
        <ContentSlot
          v-if="props.entry.slots?.afterLabel && afterLabelAtStart"
          :component="props.entry"
          name="afterLabel"
        />
      </span>
      <span v-else-if="!props.entry.inlineLabel" />
      <span v-if="hasHint" class="inline-flex items-center gap-2">
        <span
          v-if="props.entry.hint"
          :class="
            cn(
              'inline-flex items-center gap-1 text-xs',
              props.entry.hintColor
                ? textColorClasses[props.entry.hintColor]
                : 'text-muted-foreground',
            )
          "
        >
          <Icon v-if="props.entry.hintIcon" :name="props.entry.hintIcon" class="size-3.5" />
          <span v-html="props.entry.hint" />
        </span>
        <FieldHintActions v-if="props.entry.hintActions?.length" :component="props.entry" />
        <ContentSlot
          v-if="props.entry.slots?.afterLabel && !afterLabelAtStart"
          :component="props.entry"
          name="afterLabel"
        />
      </span>
      <ContentSlot
        v-if="props.entry.slots?.belowLabel && props.entry.inlineLabel"
        :component="props.entry"
        name="belowLabel"
      />
    </div>
    <ContentSlot
      v-if="props.entry.slots?.belowLabel && !props.entry.inlineLabel"
      :component="props.entry"
      name="belowLabel"
    />
    <div
      :class="props.entry.inlineLabel ? 'flex min-w-0 flex-col gap-1 sm:col-span-2' : 'contents'"
    >
      <ContentSlot
        v-if="props.entry.slots?.aboveContent"
        :component="props.entry"
        name="aboveContent"
      />
      <div
        data-slot="entry-value"
        :data-alignment="props.entry.alignment"
        :class="cn('text-sm', props.entry.alignment && ENTRY_ALIGNMENT[props.entry.alignment])"
        v-bind="props.entry.extraAttributes"
      >
        <div v-if="hasSideSlots" data-slot="entry-content" class="flex items-center gap-2">
          <ContentSlot
            v-if="props.entry.slots?.beforeContent"
            :component="props.entry"
            name="beforeContent"
            class="shrink-0 flex-nowrap"
          />
          <div class="min-w-0 flex-1">
            <FieldAffixActions :component="props.entry">
              <Tooltip v-if="props.entry.tooltip">
                <TooltipTrigger as-child>
                  <div class="w-fit"><slot /></div>
                </TooltipTrigger>
                <TooltipContent>{{ props.entry.tooltip }}</TooltipContent>
              </Tooltip>
              <slot v-else />
            </FieldAffixActions>
          </div>
          <ContentSlot
            v-if="props.entry.slots?.afterContent"
            :component="props.entry"
            name="afterContent"
            class="shrink-0 flex-nowrap"
          />
        </div>
        <FieldAffixActions v-else :component="props.entry">
          <Tooltip v-if="props.entry.tooltip">
            <TooltipTrigger as-child>
              <div class="w-fit"><slot /></div>
            </TooltipTrigger>
            <TooltipContent>{{ props.entry.tooltip }}</TooltipContent>
          </Tooltip>
          <slot v-else />
        </FieldAffixActions>
      </div>
      <p
        v-if="props.entry.helperText"
        class="text-muted-foreground text-xs"
        v-html="props.entry.helperText"
      />
      <ContentSlot
        v-if="props.entry.slots?.belowContent"
        :component="props.entry"
        name="belowContent"
      />
    </div>
  </div>
</template>
