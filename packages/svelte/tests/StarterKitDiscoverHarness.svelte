<script lang="ts">
  import { AlfakitStarterKitRoot, type StarterKitPageOptions } from '../src/starter-kit'
  import DiscoverProbe from './StarterKitDiscoverProbe.svelte'

  let { options }: { options: StarterKitPageOptions } = $props()
</script>

<AlfakitStarterKitRoot {options}>
  <DiscoverProbe />
</AlfakitStarterKitRoot>
