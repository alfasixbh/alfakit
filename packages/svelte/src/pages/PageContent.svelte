<script lang="ts">
  import { uniqueKey } from '../lib/keys'
  import type { PageSchema } from '@alfakit/core'
  import ContentBlockRenderer from './ContentBlockRenderer.svelte'

  let { page }: { page: PageSchema } = $props()
</script>

<div class="flex flex-col gap-6">
  {#each page.content as block, blockIndex (uniqueKey(page.content, blockIndex, (item) => item.key))}
    <ContentBlockRenderer {block} />
  {/each}
</div>
