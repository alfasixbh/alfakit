<script setup lang="ts">
import type { BaseField } from '@alfakit/core'
import { fieldIds, hasSlots, mergeAttributes } from '@alfakit/core'
import { computed, type HTMLAttributes } from 'vue'
import { textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Label from '../ui/Label.vue'
import ContentSlot from './ContentSlot.vue'
import FieldAffixActions from './FieldAffixActions.vue'
import FieldHintActions from './FieldHintActions.vue'
import { useInFusedGroup } from './fused-group'

/**
 * Label, hint, content slots, helper text and validation error around a form control.
 */
const props = withDefaults(
  defineProps<{
    field: BaseField
    htmlFor: string
    error?: string
    /** Render the label after the control (checkbox, toggle). */
    inline?: boolean
    class?: HTMLAttributes['class']
    /** Suppress the label (the control renders its own). */
    hideLabel?: boolean
  }>(),
  { inline: false, hideLabel: false },
)

const fused = useInFusedGroup()
const label = computed(() => (props.hideLabel ? null : props.field.label))
// Stable ids the control references through `aria-describedby` / `aria-labelledby`.
const ids = computed(() => fieldIds(props.htmlFor))
const hintUrl = computed(() =>
  typeof props.field.meta?.hintUrl === 'string' ? props.field.meta.hintUrl : undefined,
)
const wrapperAttributes = computed(() =>
  mergeAttributes(props.field.extraAttributes, props.field.extraFieldWrapperAttributes),
)
// `afterLabel()` sits with the hint at the end of the label row unless aligned to the start.
const afterLabelAtStart = computed(() => props.field.slots?.afterLabel?.alignment === 'start')
const hasLabelLine = computed(
  () =>
    Boolean(label.value) ||
    Boolean(props.field.slots?.beforeLabel) ||
    (Boolean(props.field.slots?.afterLabel) && afterLabelAtStart.value),
)
const hasHint = computed(
  () =>
    Boolean(props.field.hint) ||
    Boolean(props.field.hintActions?.length) ||
    (Boolean(props.field.slots?.afterLabel) && !afterLabelAtStart.value),
)
const hasSideSlots = computed(() => hasSlots(props.field, ['beforeContent', 'afterContent']))
const hintClass = computed(() =>
  cn(
    'inline-flex items-center gap-1 text-xs',
    props.field.hintColor ? textColorClasses[props.field.hintColor] : 'text-muted-foreground',
  ),
)
</script>

<template>
  <!-- Inside a FusedGroup: the control only; the label stays for screen readers and the
       group shows the error. -->
  <div
    v-if="fused"
    data-slot="field"
    :data-field="props.field.statePath"
    data-fused=""
    :class="cn('flex h-full flex-col', props.class)"
    v-bind="wrapperAttributes"
  >
    <Label v-if="label" :id="ids.label" :for="props.htmlFor" class="sr-only">{{ label }}</Label>
    <FieldAffixActions :component="props.field"><slot /></FieldAffixActions>
    <p
      v-if="props.error && props.field.allowHtmlValidationMessages"
      :id="ids.error"
      class="sr-only"
      role="alert"
      v-html="props.error"
    />
    <p v-else-if="props.error" :id="ids.error" class="sr-only" role="alert">
      {{ props.error }}
    </p>
  </div>
  <div
    v-else
    data-slot="field"
    :data-field="props.field.statePath"
    :data-inline-label="props.field.inlineLabel ? '' : undefined"
    :class="
      cn(
        'flex flex-col gap-1.5',
        props.field.inlineLabel && 'sm:grid sm:grid-cols-3 sm:items-start sm:gap-x-4',
        props.class,
      )
    "
    v-bind="wrapperAttributes"
  >
    <template v-if="!props.field.inlineLabel">
      <ContentSlot
        v-if="props.field.slots?.aboveLabel"
        :component="props.field"
        name="aboveLabel"
      />
    </template>
    <!-- `inlineLabel()`: label in the first column, the control in the other two from sm up;
         stacked on phones. Grid columns follow the text direction, so RTL works. -->
    <div
      v-if="props.field.inlineLabel || (!props.inline && (hasLabelLine || hasHint))"
      :data-slot="props.field.inlineLabel ? 'field-label' : undefined"
      :class="
        props.field.inlineLabel
          ? 'flex flex-col gap-1 sm:pt-2'
          : 'flex items-center justify-between gap-2'
      "
    >
      <ContentSlot
        v-if="props.field.slots?.aboveLabel && props.field.inlineLabel"
        :component="props.field"
        name="aboveLabel"
      />
      <span v-if="hasLabelLine" class="inline-flex min-w-0 items-center gap-2">
        <ContentSlot
          v-if="props.field.slots?.beforeLabel"
          :component="props.field"
          name="beforeLabel"
        />
        <Label v-if="label" :id="ids.label" :for="props.htmlFor">
          <span>
            {{ label
            }}<span v-if="props.field.required" class="text-destructive ms-0.5" aria-hidden="true"
              >*</span
            >
          </span>
        </Label>
        <ContentSlot
          v-if="props.field.slots?.afterLabel && afterLabelAtStart"
          :component="props.field"
          name="afterLabel"
        />
      </span>
      <span v-else-if="!props.field.inlineLabel" />
      <span v-if="hasHint" class="inline-flex items-center gap-2">
        <span v-if="props.field.hint" :id="ids.hint" :class="hintClass">
          <Icon v-if="props.field.hintIcon" :name="props.field.hintIcon" class="size-3.5" />
          <a v-if="hintUrl" :href="hintUrl" class="hover:underline" v-html="props.field.hint" />
          <span v-else v-html="props.field.hint" />
        </span>
        <FieldHintActions v-if="props.field.hintActions?.length" :component="props.field" />
        <ContentSlot
          v-if="props.field.slots?.afterLabel && !afterLabelAtStart"
          :component="props.field"
          name="afterLabel"
        />
      </span>
      <ContentSlot
        v-if="props.field.slots?.belowLabel && props.field.inlineLabel"
        :component="props.field"
        name="belowLabel"
      />
    </div>
    <div v-if="props.inline && !props.field.inlineLabel" class="flex items-start gap-2">
      <FieldAffixActions :component="props.field"><slot /></FieldAffixActions>
      <div class="flex flex-col gap-1">
        <span v-if="hasLabelLine" class="inline-flex min-w-0 items-center gap-2">
          <ContentSlot
            v-if="props.field.slots?.beforeLabel"
            :component="props.field"
            name="beforeLabel"
          />
          <Label
            v-if="label"
            :id="ids.label"
            :for="props.htmlFor"
            class="cursor-pointer font-normal"
          >
            <span>
              {{ label
              }}<span v-if="props.field.required" class="text-destructive ms-0.5" aria-hidden="true"
                >*</span
              >
            </span>
          </Label>
          <ContentSlot
            v-if="props.field.slots?.afterLabel && afterLabelAtStart"
            :component="props.field"
            name="afterLabel"
          />
        </span>
        <span v-if="hasHint" class="inline-flex items-center gap-2">
          <span v-if="props.field.hint" :id="ids.hint" :class="hintClass">
            <Icon v-if="props.field.hintIcon" :name="props.field.hintIcon" class="size-3.5" />
            <a v-if="hintUrl" :href="hintUrl" class="hover:underline" v-html="props.field.hint" />
            <span v-else v-html="props.field.hint" />
          </span>
          <FieldHintActions v-if="props.field.hintActions?.length" :component="props.field" />
          <ContentSlot
            v-if="props.field.slots?.afterLabel && !afterLabelAtStart"
            :component="props.field"
            name="afterLabel"
          />
        </span>
      </div>
    </div>
    <div
      :class="props.field.inlineLabel ? 'flex min-w-0 flex-col gap-1.5 sm:col-span-2' : 'contents'"
    >
      <ContentSlot
        v-if="props.field.slots?.belowLabel && !props.field.inlineLabel"
        :component="props.field"
        name="belowLabel"
      />
      <template v-if="!props.inline || props.field.inlineLabel">
        <ContentSlot
          v-if="props.field.slots?.aboveContent"
          :component="props.field"
          name="aboveContent"
        />
        <div v-if="hasSideSlots" data-slot="field-content" class="flex items-center gap-2">
          <ContentSlot
            v-if="props.field.slots?.beforeContent"
            :component="props.field"
            name="beforeContent"
            class="shrink-0 flex-nowrap"
          />
          <div class="min-w-0 flex-1">
            <FieldAffixActions :component="props.field"><slot /></FieldAffixActions>
          </div>
          <ContentSlot
            v-if="props.field.slots?.afterContent"
            :component="props.field"
            name="afterContent"
            class="shrink-0 flex-nowrap"
          />
        </div>
        <FieldAffixActions v-else :component="props.field"><slot /></FieldAffixActions>
      </template>
      <p
        v-if="props.field.helperText"
        :id="ids.helper"
        class="text-muted-foreground text-xs"
        v-html="props.field.helperText"
      />
      <ContentSlot
        v-if="props.field.slots?.belowContent"
        :component="props.field"
        name="belowContent"
      />
      <template v-if="props.error">
        <ContentSlot
          v-if="props.field.slots?.aboveErrorMessage"
          :component="props.field"
          name="aboveErrorMessage"
        />
        <p
          v-if="props.field.allowHtmlValidationMessages"
          :id="ids.error"
          class="text-destructive text-xs"
          role="alert"
          v-html="props.error"
        />
        <p v-else :id="ids.error" class="text-destructive text-xs" role="alert">
          {{ props.error }}
        </p>
        <ContentSlot
          v-if="props.field.slots?.belowErrorMessage"
          :component="props.field"
          name="belowErrorMessage"
        />
      </template>
    </div>
  </div>
</template>
