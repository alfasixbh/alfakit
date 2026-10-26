<script setup lang="ts">
import { widgetPollTarget, type LazyWidgetSchema } from '@alfakit/core'
import { ref } from 'vue'
import { useRefreshComponents, useT } from '../../context'
import Button from '../ui/Button.vue'
import LazyPlaceholder from './LazyPlaceholder.vue'

/**
 * A lazy widget's cell: the skeleton while its schema loads, or, when the request failed
 * (outside panels: a refused or failed fetch), a message with a retry.
 */
const props = defineProps<{ widget: LazyWidgetSchema }>()
const t = useT()
const refresh = useRefreshComponents()
const retrying = ref(false)

function retry() {
  if (!refresh) return

  retrying.value = true
  void Promise.resolve(refresh([widgetPollTarget(props.widget)])).finally(() => {
    retrying.value = false
  })
}
</script>

<template>
  <div
    v-if="props.widget.failed"
    data-slot="lazy-placeholder"
    :data-variant="props.widget.type === 'TableWidget' ? 'table' : 'widget'"
    data-failed=""
    role="alert"
    class="bg-card text-muted-foreground flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center text-sm"
  >
    <p>{{ t('widget_failed', {}, 'This widget could not be loaded.') }}</p>
    <Button
      v-if="refresh"
      type="button"
      variant="outline"
      size="sm"
      :disabled="retrying"
      @click="retry"
    >
      {{ t('retry', {}, 'Retry') }}
    </Button>
  </div>
  <LazyPlaceholder v-else :variant="props.widget.type === 'TableWidget' ? 'table' : 'widget'" />
</template>
