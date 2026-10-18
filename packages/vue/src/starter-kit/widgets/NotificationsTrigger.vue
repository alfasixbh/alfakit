<script setup lang="ts">
import type { StarterKitWidgets } from '@alfakit/core'
import { BellIcon } from '@lucide/vue'
import { computed } from 'vue'

/** The bell and its unread count until the menu has loaded. */
const props = defineProps<{ source: StarterKitWidgets }>()

const notifications = computed(() => props.source.widgets.notifications)
const count = computed(() => notifications.value?.unreadCount ?? 0)
</script>

<template>
  <button
    type="button"
    data-slot="notifications-trigger"
    :aria-label="notifications?.label"
    class="hover:bg-accent hover:text-accent-foreground relative inline-flex size-9 items-center justify-center rounded-md"
  >
    <BellIcon class="size-4" aria-hidden="true" />
    <span
      v-if="count > 0"
      class="bg-primary text-primary-foreground absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium"
      >{{ count > 99 ? '99+' : count }}</span
    >
  </button>
</template>
