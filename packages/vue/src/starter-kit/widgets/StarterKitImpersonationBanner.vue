<script lang="ts">
// The header components appear in both header layouts and next to each other: the first
// one mounted shows the banner, the others render nothing.
let owner: symbol | null = null
</script>

<script setup lang="ts">
import { isAlfakitPage, type StarterKitWidgets } from '@alfakit/core'
import { usePage } from '@inertiajs/vue3'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ImpersonationBanner from '../../components/panel/ImpersonationBanner.vue'

/**
 * The impersonation banner (who you are signed in as, **Leave**) on the host's own pages,
 * rendered by the header components. AlfaKit's pages render their own (`AlfakitRoot`).
 */
const props = defineProps<{ source: StarterKitWidgets | null }>()
const page = usePage()
const id = Symbol('impersonation-banner')
const owns = ref(false)
const impersonation = computed(() => props.source?.widgets.impersonation)
const active = computed(() => impersonation.value !== undefined && !isAlfakitPage(page.props))

function release(): void {
  if (owner === id) owner = null
  owns.value = false
}

// Claimed once mounted, so the server render and hydration never include it.
let stop: (() => void) | null = null

onMounted(() => {
  stop = watch(
    active,
    (value) => {
      if (!value) {
        release()

        return
      }

      if (owner === null) owner = id
      owns.value = owner === id
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
