<script setup lang="ts">
import { actionPath, isModalHiddenByChild } from '@alfakit/core'
import { onScopeDispose } from 'vue'
import { useStore } from '../../composables/use-store'
import { useActionRunner } from '../../context'
import { showToast } from '../notifications/flash-toasts'
import ActionModal from './ActionModal.vue'

/** Renders every open action modal from the runner store. Mount once per app. */
const runner = useActionRunner()
const state = useStore(runner.store)

// Notifications from JSON responses (a modal `mountUsing()` cancelled, field actions).
runner.setNotificationHandler((notifications) => notifications.forEach((n) => showToast(n)))
onScopeDispose(() => runner.setNotificationHandler(undefined))
</script>

<template>
  <ActionModal
    v-for="(modal, index) in state.modals"
    :key="`${actionPath(modal.action, modal.context)}-${modal.context.record ?? ''}`"
    :modal="modal"
    :hidden="isModalHiddenByChild(state.modals, index)"
  />
</template>
