<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
import type { HTMLAttributes } from 'vue'
import { usePanel } from '../../context'
import { cn } from '../../lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
const panel = usePanel()
</script>

<template>
  <Link
    :href="panel.url ?? '/'"
    :class="cn('flex items-center gap-2 overflow-hidden', props.class)"
  >
    <template v-if="panel.brandLogo">
      <img
        :src="panel.brandLogo"
        :alt="panel.brandName"
        :style="{ height: panel.brandLogoHeight ?? '1.75rem' }"
        :class="cn('max-w-full object-contain', panel.darkModeBrandLogo && 'dark:hidden')"
      />
      <img
        v-if="panel.darkModeBrandLogo"
        :src="panel.darkModeBrandLogo"
        :alt="panel.brandName"
        :style="{ height: panel.brandLogoHeight ?? '1.75rem' }"
        class="hidden max-w-full object-contain dark:block"
      />
    </template>
    <template v-else>
      <span
        class="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
        >{{ panel.brandName.charAt(0) }}</span
      >
      <span class="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">{{
        panel.brandName
      }}</span>
    </template>
  </Link>
</template>
