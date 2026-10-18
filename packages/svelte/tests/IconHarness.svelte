<script lang="ts">
  import { createDefaultRegistry } from '../src/registry'
  import { provideAlfakit } from '../src/context.svelte'
  import Icon from '../src/lib/Icon.svelte'
  import CustomIcon from './CustomIcon.svelte'
  import { context } from './mocks'

  provideAlfakit({
    ...context,
    registry: createDefaultRegistry().register('panel:icon', CustomIcon),
  })
</script>

<Icon name="trash-2" />
