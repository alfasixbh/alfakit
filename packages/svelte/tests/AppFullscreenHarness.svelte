<script lang="ts">
  import type { PageSchema } from '@alfakit/core'
  import FullscreenLayout from '../src/layouts/FullscreenLayout.svelte'

  let { page }: { page: PageSchema } = $props()
</script>

<FullscreenLayout {page}><p>Register</p></FullscreenLayout>
