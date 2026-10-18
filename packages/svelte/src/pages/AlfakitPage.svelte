<script lang="ts">
  import { openDefaultAction, resolveLazyComponents, type DefaultActionOpener } from '@alfakit/core'
  import { providePageActionContext } from '../components/actions/action-context'
  import { useActionRunner, useAlfakit, useAlfakitProps, usePanel, useT } from '../context.svelte'
  import PageContent from './PageContent.svelte'
  import PageShell from './PageShell.svelte'

  /**
   * `Alfakit/Page`: renders any schema-driven page. Custom pages (`Page::$component`) are
   * resolved from the `pages` map passed to `createAlfakit()`.
   */
  const { pages } = useAlfakit()
  // Lazy widgets and relation managers arrive in a deferred prop after the first response.
  const page = $derived.by(() => {
    const props = useAlfakitProps()

    return props.page ? resolveLazyComponents(props.page, props.alfakitLazy) : undefined
  })
  const panel = $derived(usePanel())
  const t = useT()
  const title = $derived(page ? `${page.title} - ${panel.brandName}` : panel.brandName)
  const Custom = $derived(page?.view ? pages[page.view.component] : undefined)

  // The page's default action (`$defaultAction`, `?tableAction=`) opens once the page has
  // hydrated, and once per page: re-renders after the action ran don't open it again.
  const runner = useActionRunner()
  const opener: DefaultActionOpener = { opened: null }

  $effect(() => {
    openDefaultAction(page, opener, (action, context) => runner.trigger(action, context))
  })

  providePageActionContext({
    get token() {
      return page?.token ?? ''
    },
    component: 'page',
  })
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

{#if page}
  {#if page.view}
    <PageShell {page}>
      {#if Custom}
        <Custom {...page.view.props} {page} />
      {:else}
        <div class="text-destructive p-6">
          {t(
            'page_not_registered',
            { component: page.view.component },
            `Page component ${page.view.component} is not registered in createAlfakit({ pages }).`,
          )}
        </div>
      {/if}
    </PageShell>
  {:else}
    <PageShell {page}>
      <PageContent {page} />
    </PageShell>
  {/if}
{/if}
