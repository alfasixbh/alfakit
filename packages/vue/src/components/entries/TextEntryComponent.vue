<script setup lang="ts">
import type { TextEntrySchema } from '@alfakit/core'
import { Link } from '@inertiajs/vue3'
import EntryPlaceholder from './EntryPlaceholder.vue'
import EntryWrapper from './EntryWrapper.vue'
import FormattedText from './FormattedText.vue'
import NewTabHint from '../../lib/NewTabHint.vue'

const props = defineProps<{ component: TextEntrySchema }>()
</script>

<template>
  <EntryWrapper :entry="props.component">
    <EntryPlaceholder
      v-if="props.component.state === null || props.component.state === undefined"
      :entry="props.component"
    />
    <a
      v-else-if="props.component.url && props.component.openUrlInNewTab"
      :href="props.component.url"
      target="_blank"
      rel="noopener noreferrer"
      class="hover:underline"
    >
      <FormattedText :value="props.component.state" :schema="props.component" />
      <NewTabHint />
    </a>
    <Link v-else-if="props.component.url" :href="props.component.url" class="hover:underline">
      <FormattedText :value="props.component.state" :schema="props.component" />
    </Link>
    <FormattedText v-else :value="props.component.state" :schema="props.component" />
  </EntryWrapper>
</template>
