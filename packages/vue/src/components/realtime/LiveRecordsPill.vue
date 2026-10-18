<script setup lang="ts">
import type { LiveUpdates } from '@alfakit/core'
import { ArrowUpIcon } from '@lucide/vue'
import { useChoice } from '../../context'
import Button from '../ui/Button.vue'

/** "3 new records — show": created records the table doesn't show yet. */
const props = defineProps<{ live: LiveUpdates; pending: number }>()
const choice = useChoice()
</script>

<template>
  <div data-slot="live-records" aria-live="polite" class="flex justify-center">
    <Button
      v-if="props.pending > 0"
      type="button"
      size="sm"
      variant="secondary"
      class="rounded-full shadow-sm"
      @click="props.live.showPending()"
    >
      <ArrowUpIcon aria-hidden="true" />
      {{
        choice(
          'realtime.new_records',
          props.pending,
          {},
          '{1} :count new record — show|[2,*] :count new records — show',
        )
      }}
    </Button>
  </div>
</template>
