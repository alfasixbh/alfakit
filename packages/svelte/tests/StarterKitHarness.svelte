<script lang="ts">
  import { AlfakitPage } from '../src/pages'
  import { AlfakitStarterKitRoot } from '../src/starter-kit'
  import StarterKitHostLayout from './StarterKitHostLayout.svelte'

  // How Inertia composes the page's layouts: the host layout, then the Alfakit root.
  let { breadcrumbs }: { breadcrumbs: { title: string; href: string }[] } = $props()
</script>

<StarterKitHostLayout {breadcrumbs}>
  <AlfakitStarterKitRoot>
    <AlfakitPage />
  </AlfakitStarterKitRoot>
</StarterKitHostLayout>
