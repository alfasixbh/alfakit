<script lang="ts">
  import type { Store } from '@alfakit/core'
  import { useHydrated } from '../src/hooks/hydrated.svelte'
  import { useStore } from '../src/hooks/store.svelte'

  let { store }: { store: Store<{ count: number }> } = $props()
  const hydrated = useHydrated()
  // svelte-ignore state_referenced_locally
  const state = useStore(store)
</script>

<span data-testid="hydrated">{String(hydrated.current)}</span>
<span data-testid="count">{state.current.count}</span>
