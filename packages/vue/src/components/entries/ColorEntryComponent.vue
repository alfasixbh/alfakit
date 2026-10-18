<script setup lang="ts">
import type { ColorEntrySchema } from '@alfakit/core'
import { computed } from 'vue'
import EntryLink from './EntryLink.vue'
import EntryPlaceholder from './EntryPlaceholder.vue'
import EntryWrapper from './EntryWrapper.vue'
import FormattedText from './FormattedText.vue'

const props = defineProps<{ component: ColorEntrySchema }>()
const colors = computed(() =>
  Array.isArray(props.component.state)
    ? props.component.state
    : props.component.state
      ? [props.component.state]
      : [],
)
</script>

<template>
  <EntryWrapper :entry="props.component">
    <EntryPlaceholder v-if="colors.length === 0" :entry="props.component" />
    <EntryLink v-else :entry="props.component">
      <div class="flex flex-wrap items-center gap-2">
        <span
          v-for="(color, index) in colors"
          :key="index"
          class="inline-flex items-center gap-1.5 text-sm"
        >
          <span class="size-5 rounded border shadow-xs" :style="{ backgroundColor: color }" />
          <!-- The code honours the entry's text styles and copy settings. -->
          <FormattedText
            v-if="props.component.copyable"
            :value="color"
            class="text-xs"
            :schema="{
              size: props.component.size,
              weight: props.component.weight,
              fontFamily: props.component.fontFamily ?? 'mono',
              copyable: true,
              copyMessage: props.component.copyMessage,
              copyMessageDuration: props.component.copyMessageDuration,
            }"
          />
        </span>
      </div>
    </EntryLink>
  </EntryWrapper>
</template>
