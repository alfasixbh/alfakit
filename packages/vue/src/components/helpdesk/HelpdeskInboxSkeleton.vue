<script setup lang="ts">
import { useT } from '../../context'
import Card from '../ui/Card.vue'
import Skeleton from '../ui/Skeleton.vue'

const t = useT()
</script>

<template>
  <Card
    data-slot="helpdesk-inbox"
    aria-busy="true"
    class="grid h-[calc(100svh-12rem)] min-h-[34rem] grid-cols-1 gap-0 overflow-hidden py-0 md:grid-cols-[18rem_1fr] xl:grid-cols-[13rem_20rem_1fr]"
  >
    <span class="sr-only">{{ t('helpdesk.loading', {}, 'Loading…') }}</span>
    <div class="flex flex-col gap-2 border-e p-2 max-xl:hidden" aria-hidden="true">
      <Skeleton v-for="index in 6" :key="index" class="h-7" />
    </div>
    <div class="flex flex-col gap-2 border-e p-2" aria-hidden="true">
      <Skeleton class="h-9" />
      <Skeleton v-for="index in 6" :key="index" class="h-16" />
    </div>
    <div class="flex flex-col gap-3 p-4 max-md:hidden" aria-hidden="true">
      <Skeleton class="h-6 w-1/2" />
      <Skeleton class="h-24" />
      <Skeleton class="h-24" />
    </div>
  </Card>
</template>
