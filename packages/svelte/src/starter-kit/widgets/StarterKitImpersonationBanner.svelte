<script lang="ts" module>
  // The header components appear in both header layouts and next to each other: the first
  // one mounted shows the banner, the others render nothing. When that one goes away (a
  // host that renders it conditionally), the next one takes over.
  let candidates = $state.raw<symbol[]>([])
</script>

<script lang="ts">
  import { isAlfakitPage, type StarterKitWidgets } from '@alfakit/core'
  import { page } from '@inertiajs/svelte'
  import { untrack } from 'svelte'
  import ImpersonationBanner from '../../components/panel/ImpersonationBanner.svelte'

  /**
   * The impersonation banner (who you are signed in as, **Leave**) on the host's own pages,
   * rendered by the header components. AlfaKit's pages render their own (`AlfakitRoot`).
   */
  let { source }: { source: StarterKitWidgets | null } = $props()

  const id = Symbol('impersonation-banner')
  const impersonation = $derived(source?.widgets.impersonation)
  const active = $derived(impersonation !== undefined && !isAlfakitPage(page.props))
  const owns = $derived(candidates[0] === id)

  // Claimed once mounted (effects never run on the server), so SSR and hydration skip it.
  $effect(() => {
    if (!active) return

    untrack(() => (candidates = [...candidates, id]))

    return () => {
      candidates = candidates.filter((candidate) => candidate !== id)
    }
  })
</script>

{#if active && owns}
  <ImpersonationBanner {impersonation} />
{/if}
