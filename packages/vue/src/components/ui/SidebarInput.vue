<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'
import Input from './Input.vue'

const props = defineProps<{ class?: HTMLAttributes['class']; modelValue?: string }>()
const emits = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <Input
    data-slot="sidebar-input"
    data-sidebar="input"
    :model-value="props.modelValue"
    :class="cn('bg-background h-8 w-full shadow-none', props.class)"
    @update:model-value="emits('update:modelValue', $event)"
  />
</template>
