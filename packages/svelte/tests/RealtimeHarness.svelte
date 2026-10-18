<script lang="ts">
  import type { PageSchema } from '@alfakit/core'
  import ConflictBanner from '../src/components/realtime/ConflictBanner.svelte'
  import RecordPresence from '../src/components/realtime/RecordPresence.svelte'

  /** A record page's presence avatars and conflict banner side by side. */
  let { page }: { page: PageSchema } = $props()
</script>

{#if page.presence}<RecordPresence presence={page.presence} />{/if}
<ConflictBanner {page} />
