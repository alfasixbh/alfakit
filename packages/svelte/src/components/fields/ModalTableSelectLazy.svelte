<script lang="ts" module>
  import type { ModalTableSelectSchema } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // The picker's code (its table) loads the first time a ModalTableSelect is shown.
  const loader = lazyLoader<{ component: ModalTableSelectSchema }>(() =>
    import('./ModalTableSelectField.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import LazyField from './LazyField.svelte'

  let { component }: { component: ModalTableSelectSchema } = $props()
</script>

<LazyField {loader} {component} />
