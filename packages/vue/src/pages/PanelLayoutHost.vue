<script setup lang="ts">
import { resolveLazyComponents, type AlfakitPageProps } from '@alfakit/core'
import { usePage } from '@inertiajs/vue3'
import { computed, provide } from 'vue'
import { HOSTED_LAYOUT, layoutKind } from './hosted-layout'
import PanelLayout from './PanelLayout.vue'

/**
 * Keeps the panel layout (sidebar, top bar) mounted while the user moves between Alfakit
 * pages. Inertia remounts the page component on every visit; this sits in the persistent
 * Inertia layout (`AlfakitRoot`) and renders the open page's layout from its props, so only
 * the page part below it (heading, actions, content) is replaced. The `PageShell` inside
 * the page then renders just that part. Custom page components (their own Inertia page or
 * `page.view`) and starter kit pages render their layout through `PageShell` as before.
 */
const inertia = usePage<AlfakitPageProps>()

const hosted = computed(() => {
  const props = inertia.props
  const page = props.page

  if (inertia.component !== 'Alfakit/Page' || !page || page.view) return undefined
  if (props.alfakit?.starterKit === true) return undefined

  return resolveLazyComponents(page, props.alfakitLazy)
})

provide(
  HOSTED_LAYOUT,
  computed(() => (hosted.value ? layoutKind(hosted.value) : null)),
)
</script>

<template>
  <PanelLayout v-if="hosted" :page="hosted">
    <slot />
  </PanelLayout>
  <slot v-else />
</template>
