<script lang="ts">
  import { resolveLazyComponents } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import { providePageActionContext } from '../components/actions/action-context'
  import { useAlfakitProps, usePanel } from '../context.svelte'
  import PageShell from '../pages/PageShell.svelte'

  /**
   * The page's layout (sidebar and topbar, `fullscreen`…), heading, header actions and
   * document title around a custom component: `<AppPage>…</AppPage>`.
   */
  let { children }: { children?: Snippet } = $props()

  const page = $derived.by(() => {
    const props = useAlfakitProps()

    return props.page ? resolveLazyComponents(props.page, props.alfakitLazy) : undefined
  })
  const panel = $derived(usePanel())

  providePageActionContext({
    get token() {
      return page?.token ?? ''
    },
    component: 'page',
  })
</script>

<svelte:head>
  {#if page}<title>{page.title} - {panel.brandName}</title>{/if}
</svelte:head>

{#if page}
  <PageShell {page}>{@render children?.()}</PageShell>
{:else}
  {@render children?.()}
{/if}
