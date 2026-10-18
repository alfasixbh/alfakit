<script setup lang="ts">
import type { ImpersonationSchema } from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { LogOutIcon, VenetianMaskIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { usePanel } from '../../context'
import Button from '../ui/Button.vue'

/**
 * Shown while impersonating another user: who you are signed in as, and a button that
 * returns to your own account. Replace it with `components: { 'panel:impersonation-banner': … }`.
 */
const props = defineProps<{ impersonation?: ImpersonationSchema }>()

const panel = usePanel()
const current = computed(() => props.impersonation ?? panel.value?.impersonation)
const leaving = ref(false)

function leave(): void {
  if (!current.value) return

  leaving.value = true
  router.post(current.value.leaveUrl, {}, { onFinish: () => (leaving.value = false) })
}
</script>

<template>
  <div
    v-if="current"
    data-slot="impersonation-banner"
    role="status"
    class="bg-foreground text-background fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-full py-1.5 ps-4 pe-1.5 text-sm shadow-lg"
  >
    <VenetianMaskIcon class="size-4 shrink-0" aria-hidden="true" />
    <span class="min-w-0 truncate">{{ current.label }}</span>
    <Button
      type="button"
      size="sm"
      variant="secondary"
      class="rounded-full"
      :disabled="leaving"
      @click="leave"
    >
      <LogOutIcon class="rtl:rotate-180" aria-hidden="true" />
      {{ current.leaveLabel }}
    </Button>
  </div>
</template>
