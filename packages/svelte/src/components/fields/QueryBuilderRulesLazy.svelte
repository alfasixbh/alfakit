<script lang="ts" module>
  import type { QueryBuilderRulesSchema } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // The rule editor's code loads the first time a query builder filter is shown.
  const loader = lazyLoader<{ component: QueryBuilderRulesSchema }>(() =>
    import('./QueryBuilderRulesField.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import LazyField from './LazyField.svelte'

  let { component }: { component: QueryBuilderRulesSchema } = $props()
</script>

<LazyField {loader} {component} height="h-24" />
