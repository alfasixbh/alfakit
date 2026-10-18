<script lang="ts">
  import type { SubNavigationSchema } from '@alfakit/core'
  import SubNavigationLayout from '../src/components/panel/SubNavigationLayout.svelte'
  import { provideAlfakit } from '../src/context.svelte'
  import { context } from './mocks'

  let { navigation }: { navigation: SubNavigationSchema } = $props()

  provideAlfakit(context)
</script>

<SubNavigationLayout {navigation}><p>Body</p></SubNavigationLayout>
