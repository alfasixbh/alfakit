<script setup lang="ts">
import { Loader2Icon } from '@lucide/vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'
import { useT } from '../../context'
import Icon from '../../lib/Icon.vue'

/**
 * The loading indicator. Its glyph is the `alfakit::support.loading-indicator` icon alias,
 * so an app replaces it everywhere with `Icons::register()` (or a `panel:icon` component).
 */
const props = defineProps<{ class?: HTMLAttributes['class'] }>()
const t = useT()
</script>

<template>
  <span
    role="status"
    :aria-label="t('loading', {}, 'Loading')"
    data-slot="spinner"
    class="inline-flex shrink-0"
  >
    <Icon
      name="alfakit::support.loading-indicator"
      :fallback="Loader2Icon"
      aria-hidden="true"
      :class="cn('size-4 animate-spin', props.class)"
    />
  </span>
</template>
