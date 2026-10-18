<script setup lang="ts">
import { CircleCheckIcon, CircleXIcon, InfoIcon, Loader2Icon, TriangleAlertIcon } from '@lucide/vue'
import { Toaster as Sonner, type ToasterProps } from 'vue-sonner'
import { useT } from '../../context'

const props = withDefaults(defineProps<ToasterProps>(), { theme: 'system' })
const t = useT()
</script>

<template>
  <!-- vue-sonner appends the hotkey to the container label: "Notifications alt+T". -->
  <Sonner
    class="toaster group"
    v-bind="props"
    :container-aria-label="props.containerAriaLabel ?? t('notifications', {}, 'Notifications')"
    :toast-options="{
      closeButtonAriaLabel: t('close_notification', {}, 'Close notification'),
      ...props.toastOptions,
    }"
    :style="{
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
    }"
  >
    <template #success-icon><CircleCheckIcon class="size-4" /></template>
    <template #info-icon><InfoIcon class="size-4" /></template>
    <template #warning-icon><TriangleAlertIcon class="size-4" /></template>
    <template #error-icon><CircleXIcon class="size-4" /></template>
    <template #loading-icon><Loader2Icon class="size-4 animate-spin" /></template>
  </Sonner>
</template>
