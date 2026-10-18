<script setup lang="ts">
import { useT } from '../../context'

const t = useT()
</script>

<template>
  <nav :aria-label="t('breadcrumbs', {}, 'Breadcrumb')" data-slot="breadcrumb">
    <slot />
  </nav>
</template>
