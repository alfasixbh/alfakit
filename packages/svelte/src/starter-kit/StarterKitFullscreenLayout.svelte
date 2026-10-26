<script lang="ts">
  import type { Snippet } from 'svelte'
  import Slot from '../components/panel/Slot.svelte'

  /**
   * A `$layout = 'fullscreen'` page inside the host layout: what `layout:fullscreen` renders in
   * starter kit mode. The host layout is the chrome, so there is no AlfaKit header (brand, top
   * bar slots, user menu, Exit); the screen gets the whole content area. Replace it with
   * `{ components: { 'layout:fullscreen': MyScreen } }`.
   */
  let { children }: { children?: Snippet } = $props()
</script>

<div
  data-slot="content"
  data-layout="fullscreen"
  data-alfakit-embedded=""
  class="flex min-h-0 w-full min-w-0 flex-1 flex-col"
>
  <Slot name="content.start" />
  {@render children?.()}
  <Slot name="content.end" />
</div>
