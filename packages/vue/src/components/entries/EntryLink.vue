<script setup lang="ts">
import type { BaseEntry } from '@alfakit/core'
import { Link } from '@inertiajs/vue3'
import NewTabHint from '../../lib/NewTabHint.vue'

/** Wrap an entry's content in its `url()` link (icon, image and colour entries). */
const props = defineProps<{ entry: BaseEntry }>()
</script>

<template>
  <a
    v-if="props.entry.url && props.entry.openUrlInNewTab"
    :href="props.entry.url"
    target="_blank"
    rel="noopener noreferrer"
    class="inline-flex w-fit"
    ><slot /><NewTabHint
  /></a>
  <Link v-else-if="props.entry.url" :href="props.entry.url" class="inline-flex w-fit"
    ><slot
  /></Link>
  <slot v-else />
</template>
