<script setup lang="ts">
import { canInstallPwa, pwaStore, subscribeToPush, unsubscribeFromPush } from '@alfakit/core'
import { BellIcon, BellOffIcon, DownloadIcon } from '@lucide/vue'
import { computed } from 'vue'
import { toast } from 'vue-sonner'
import { useStore } from '../../composables/use-store'
import { usePanel, useT } from '../../context'
import { Icon } from '../../lib/icons'
import DropdownMenuItem from '../ui/DropdownMenuItem.vue'
import { installPwa } from './pwa'

/** User menu entries: "Install app" and turning Web Push on or off for this browser. */
const panel = usePanel()
const t = useT()
const state = useStore(pwaStore)

const enabled = computed(() => Boolean(panel.value?.pwa))
const installable = computed(() => enabled.value && canInstallPwa(state.value))
const push = computed(() => Boolean(panel.value?.pwa?.push) && state.value.push !== 'unsupported')

async function togglePush() {
  const outcome =
    state.value.push === 'subscribed' ? await unsubscribeFromPush() : await subscribeToPush()

  if (outcome === 'subscribed') {
    toast.success(t('pwa.notifications.enabled', {}, 'Notifications are on for this device'))
  } else if (outcome === 'unsubscribed') {
    toast.success(t('pwa.notifications.disabled', {}, 'Notifications are off for this device'))
  } else if (outcome === 'denied') {
    toast.error(
      t('pwa.notifications.blocked', {}, 'Notifications are blocked in your browser settings'),
    )
  } else {
    toast.error(t('pwa.notifications.failed', {}, 'Couldn’t change notifications. Try again.'))
  }
}
</script>

<template>
  <DropdownMenuItem v-if="installable" data-slot="pwa-install" @select="installPwa(t)">
    <Icon name="alfakit::panels.user-menu.install-app-item" :fallback="DownloadIcon" />
    {{ t('pwa.install', {}, 'Install app') }}
  </DropdownMenuItem>
  <DropdownMenuItem
    v-if="push"
    data-slot="pwa-push"
    :disabled="state.pushBusy || state.push === 'denied'"
    @select="togglePush()"
  >
    <template v-if="state.push === 'subscribed'">
      <Icon name="alfakit::panels.user-menu.push-off-item" :fallback="BellOffIcon" />
      {{ t('pwa.notifications.disable', {}, 'Turn off notifications') }}
    </template>
    <template v-else>
      <Icon name="alfakit::panels.user-menu.push-on-item" :fallback="BellIcon" />
      {{ t('pwa.notifications.enable', {}, 'Turn on notifications') }}
    </template>
  </DropdownMenuItem>
</template>
