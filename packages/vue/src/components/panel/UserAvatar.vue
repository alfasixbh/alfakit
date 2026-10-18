<script setup lang="ts">
import { initials } from '@alfakit/core'
import type { HTMLAttributes } from 'vue'
import { usePanel } from '../../context'
import { cn } from '../../lib/utils'
import Avatar from '../ui/Avatar.vue'
import AvatarFallback from '../ui/AvatarFallback.vue'
import AvatarImage from '../ui/AvatarImage.vue'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
const panel = usePanel()
</script>

<template>
  <Avatar v-if="panel.user" :class="cn('size-8 rounded-lg', props.class)">
    <AvatarImage v-if="panel.user.avatar" :src="panel.user.avatar" :alt="panel.user.name" />
    <AvatarFallback class="rounded-lg" aria-hidden="true">
      {{ initials(panel.user.name) }}
    </AvatarFallback>
  </Avatar>
</template>
