<script lang="ts">
  import { provideStandalone } from '../src/context.svelte'

  // A standalone component elsewhere on the page (a starter kit's header widget) with
  // a token of its own.
  provideStandalone({ page: { token: 'header-widget-token' } } as never)
</script>
