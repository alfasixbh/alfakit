<script lang="ts">
  import { resolveLazyComponents, type AlfakitPageProps } from '@alfakit/core'
  import { page as inertia } from '@inertiajs/svelte'
  import type { Snippet } from 'svelte'
  import { layoutKind, setHostedLayout } from './hosted-layout'
  import PanelLayout from './PanelLayout.svelte'

  /**
   * Keeps the panel layout (sidebar, top bar) mounted while the user moves between Alfakit
   * pages. Inertia remounts the page component on every visit; this sits in the persistent
   * Inertia layout (`AlfakitRoot`) and renders the open page's layout from its props, so only
   * the page part below it (heading, actions, content) is replaced. The `PageShell` inside
   * the page then renders just that part. Custom page components (their own Inertia page or
   * `page.view`) and starter kit pages render their layout through `PageShell` as before.
   */
  let { children }: { children?: Snippet } = $props()

  const hosted = $derived.by(() => {
    const props = inertia.props as unknown as Partial<AlfakitPageProps>
    const page = props.page

    if (inertia.component !== 'Alfakit/Page' || !page || page.view) return undefined
    if (props.alfakit?.starterKit === true) return undefined

    return resolveLazyComponents(page, props.alfakitLazy)
  })

  setHostedLayout({
    get current() {
      return hosted ? layoutKind(hosted) : null
    },
  })
</script>

{#if hosted}
  <PanelLayout page={hosted}>{@render children?.()}</PanelLayout>
{:else}
  {@render children?.()}
{/if}
