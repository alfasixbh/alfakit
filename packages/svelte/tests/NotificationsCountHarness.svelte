<script lang="ts">
  import NotificationsMenu from '../src/components/notifications/NotificationsMenu.svelte'
  import { provideStandalone } from '../src/context.svelte'
  import { panel } from './mocks'

  let { count }: { count: number } = $props()

  // A reactive panel, as Inertia's page props are after a visit.
  provideStandalone({
    get panel() {
      return { ...panel, databaseNotifications: { unreadCount: count } }
    },
    page: {} as never,
  })
</script>

<NotificationsMenu />
