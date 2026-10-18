<script setup lang="ts">
import type { BreadcrumbSchema } from '@alfakit/core'
import { Link } from '@inertiajs/vue3'
import { useT } from '../../context'
import Breadcrumb from '../ui/Breadcrumb.vue'
import BreadcrumbItem from '../ui/BreadcrumbItem.vue'
import BreadcrumbLink from '../ui/BreadcrumbLink.vue'
import BreadcrumbList from '../ui/BreadcrumbList.vue'
import BreadcrumbPage from '../ui/BreadcrumbPage.vue'
import BreadcrumbSeparator from '../ui/BreadcrumbSeparator.vue'

const props = defineProps<{ items: BreadcrumbSchema[] }>()
const t = useT()
</script>

<template>
  <Breadcrumb
    v-if="props.items.length > 0"
    class="min-w-0"
    :aria-label="t('breadcrumbs', {}, 'Breadcrumb')"
  >
    <BreadcrumbList class="flex-nowrap">
      <template v-for="(item, index) in props.items" :key="`${item.label}-${index}`">
        <BreadcrumbItem
          :class="index < props.items.length - 1 ? 'hidden md:inline-flex' : 'min-w-0'"
        >
          <BreadcrumbPage
            v-if="index === props.items.length - 1 || !item.url"
            class="block truncate"
            >{{ item.label }}</BreadcrumbPage
          >
          <BreadcrumbLink v-else as-child>
            <Link :href="item.url">{{ item.label }}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator v-if="index !== props.items.length - 1" :class="'hidden md:block'" />
      </template>
    </BreadcrumbList>
  </Breadcrumb>
</template>
