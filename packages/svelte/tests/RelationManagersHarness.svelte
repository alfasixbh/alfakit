<script lang="ts">
  import type { RelationManagersBlock } from '@alfakit/core'
  import { provideAlfakit } from '../src/context.svelte'
  import RelationManagers from '../src/pages/RelationManagers.svelte'
  import { context } from './mocks'

  let { block }: { block: RelationManagersBlock } = $props()

  provideAlfakit(context)
</script>

<RelationManagers {block} />
