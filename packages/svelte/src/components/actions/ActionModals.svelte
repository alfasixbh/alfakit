<script lang="ts">
  import { actionPath, isModalHiddenByChild } from '@alfakit/core'
  import { uniqueKey } from '../../lib/keys'
  import { useActionRunner } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { onDestroy } from 'svelte'
  import { showToast } from '../notifications/toast'
  import ActionModal from './ActionModal.svelte'

  const runner = useActionRunner()
  const state = useStore(runner.store)

  // Notifications from JSON responses (a modal `mountUsing()` cancelled, field actions).
  runner.setNotificationHandler((notifications) => notifications.forEach((n) => showToast(n)))
  onDestroy(() => runner.setNotificationHandler(undefined))
</script>

<!-- Renders every open action modal from the runner store. Mount once per app. -->
{#each state.current.modals as modal, modalIndex (uniqueKey(state.current.modals, modalIndex, (item) => `${actionPath(item.action, item.context)}-${item.context.record ?? ''}`))}
  <ActionModal {modal} hidden={isModalHiddenByChild(state.current.modals, modalIndex)} />
{/each}
