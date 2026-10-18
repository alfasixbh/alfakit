<script setup lang="ts">
import { cmsLinkRel, type CmsLinkSchema } from '@alfakit/core'
import type { HTMLAttributes } from 'vue'
import Button from '../ui/Button.vue'
import type { ButtonVariants } from '../ui/button'
import { useCmsT } from './context'

/** A button link from a block (`primaryAction` / `secondaryAction`). */
const props = withDefaults(
  defineProps<{
    link: CmsLinkSchema | null | undefined
    variant?: ButtonVariants['variant']
    size?: ButtonVariants['size']
    class?: HTMLAttributes['class']
  }>(),
  { variant: 'default', size: 'lg', class: undefined },
)

const t = useCmsT()
</script>

<template>
  <Button
    v-if="props.link"
    as-child
    :variant="props.variant"
    :size="props.size"
    :class="props.class"
  >
    <a
      :href="props.link.url"
      :target="props.link.newTab ? '_blank' : undefined"
      :rel="cmsLinkRel(props.link.newTab)"
      data-slot="cms-link-button"
    >
      {{ props.link.label }}
      <span v-if="props.link.newTab" class="sr-only">
        {{ t('cms.new_tab', {}, '(opens in a new tab)') }}</span
      >
    </a>
  </Button>
</template>
