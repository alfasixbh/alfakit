<script setup lang="ts">
import { AvatarImage, type AvatarImageProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

const props = defineProps<AvatarImageProps & { class?: HTMLAttributes['class']; alt?: string }>()
</script>

<template>
  <AvatarImage
    data-slot="avatar-image"
    :src="props.src"
    :alt="props.alt"
    :class="cn('aspect-square size-full', props.class)"
  />
</template>
