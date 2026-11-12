<script lang="ts">
import { shallowRef } from 'vue'

// The header components appear in both header layouts and next to each other: the first
// one mounted shows the banner, the others render nothing. When that one goes away (a
// host that renders it conditionally), the next one takes over.
const candidates = shallowRef<symbol[]>([])
</script>

<script setup lang="ts">
import { isAlfakitPage, type StarterKitWidgets } from '@alfakit/core'
import { usePage } from '@inertiajs/vue3'
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import ImpersonationBanner from '../../components/panel/ImpersonationBanner.vue'

/**
 * The impersonation banner (who you are signed in as, **Leave**) on the host's own pages,
 * rendered by the header components. AlfaKit's pages render their own (`AlfakitRoot`).
 */
const props = defineProps<{ source: StarterKitWidgets | null }>()
const page = usePage()
const id = Symbol('impersonation-banner')
const owns = computed(() => candidates.value[0] === id)
const impersonation = computed(() => props.source?.widgets.impersonation)
const active = computed(() => impersonation.value !== undefined && !isAlfakitPage(page.props))

function release(): void {
  candidates.value = candidates.value.filter((candidate) => candidate !== id)
}

// Claimed once mounted, so the server render and hydration never include it.
let stop: (() => void) | null = null

onMounted(() => {
  stop = watch(
    active,
    (value) => {
      release()

      if (value) candidates.value = [...candidates.value, id]
    },
    { immediate: true },
  )
})

onBeforeUnmount(() => {
  stop?.()
  release()
})
</script>

<template>
  <ImpersonationBanner v-if="active && owns" :impersonation="impersonation" />
</template>
