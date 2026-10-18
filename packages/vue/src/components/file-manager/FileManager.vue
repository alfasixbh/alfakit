<script setup lang="ts">
import type { FileManagerSchema } from '@alfakit/core'
import FileManagerView from './FileManagerView.vue'

/** The file manager of alfasix/alfakit-file-manager (schema component `file-manager`). */
defineProps<{ component?: FileManagerSchema }>()
</script>

<template>
  <FileManagerView
    v-if="component"
    :key="`${component.disk}:${component.mode}`"
    :schema="component"
  />
</template>
