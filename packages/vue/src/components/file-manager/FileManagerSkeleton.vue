<script setup lang="ts">
import type { FileManagerSchema } from '@alfakit/core'
import { computed } from 'vue'
import { useT } from '../../context'
import Card from '../ui/Card.vue'
import Skeleton from '../ui/Skeleton.vue'

const props = defineProps<{ component?: FileManagerSchema }>()
const t = useT()
const grid = computed(() => props.component?.view !== 'list')
</script>

<template>
  <Card class="gap-0 overflow-hidden py-0" aria-busy="true" data-slot="file-manager">
    <span class="sr-only">{{ t('file-manager.loading', {}, 'Loading files') }}</span>
    <div class="flex items-center gap-2 border-b p-3" aria-hidden="true">
      <Skeleton class="h-6 w-40" />
      <Skeleton class="ms-auto h-9 w-52" />
      <Skeleton class="h-9 w-24" />
    </div>
    <div class="flex min-h-[28rem]" aria-hidden="true">
      <div class="hidden w-60 flex-col gap-2 border-e p-3 md:flex">
        <Skeleton v-for="index in 5" :key="index" class="h-6" />
      </div>
      <div
        :class="
          grid
            ? 'grid flex-1 grid-cols-2 content-start gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
            : 'flex flex-1 flex-col gap-2 p-3'
        "
      >
        <Skeleton v-for="index in 12" :key="index" :class="grid ? 'aspect-[4/3]' : 'h-10'" />
      </div>
    </div>
  </Card>
</template>
