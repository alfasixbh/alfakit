<script setup lang="ts">
import type { TranslationManagerSchema } from '@alfakit/core'
import TranslationManagerView from './TranslationManagerView.vue'

/**
 * The translation editor of alfasix/alfakit-translation-manager (schema component
 * `translation-manager`).
 */
defineProps<{ component?: TranslationManagerSchema }>()
</script>

<template>
  <TranslationManagerView v-if="component" :key="component.actionComponent" :schema="component" />
</template>
