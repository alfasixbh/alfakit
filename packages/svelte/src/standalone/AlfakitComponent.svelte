<script lang="ts">
  import {
    StandaloneComponentState,
    findStandalonePropName,
    registerStandaloneProp,
    standalonePanelSchema,
    type ContentBlock,
    type StandaloneComponentSchema,
  } from '@alfakit/core'
  import { page as inertiaPage } from '@inertiajs/svelte'
  import { onMount, untrack, type Snippet } from 'svelte'
  import { providePageActionContext } from '../components/actions/action-context'
  import ActionList from '../components/actions/ActionList.svelte'
  import ActionModals from '../components/actions/ActionModals.svelte'
  import { TooltipProvider } from '../components/ui/tooltip'
  import {
    provideAlfakit,
    provideStandalone,
    useOptionalAlfakit,
    type AlfakitContextValue,
    type AnyComponent,
  } from '../context.svelte'
  import { uniqueKey } from '../lib/keys'
  import { cn } from '../lib/utils'
  import ContentBlockRenderer from '../pages/ContentBlockRenderer.svelte'
  import AlfakitToaster from './AlfakitToaster.svelte'
  import {
    claimToaster,
    createStandaloneContext,
    createStandaloneRegistry,
    ensureStandaloneRuntime,
    hasToaster,
  } from './runtime'

  /**
   * Renders an Alfakit component outside a panel: a form, table, infolist, widgets or any
   * mix (`AlfaSix\Alfakit\Standalone\*`) in any Inertia page of the application. Needs no
   * `createAlfakit()` and no panel layout: it provides its own translator, registry, action
   * runner and modals, and inherits the application's shadcn tokens.
   *
   * ```svelte
   * <AlfakitComponent component={orders} class="max-w-4xl" />
   * ```
   *
   * Snippets: `header` (above the content blocks), `footer` (below), and `children` to
   * render the blocks yourself (`{#snippet children(blocks)}…<ContentBlockRenderer {block} />`).
   */
  let {
    component,
    components,
    class: className,
    header,
    footer,
    children,
  }: {
    /** The payload: `ContactForm::make()` passed as an Inertia prop. */
    component: StandaloneComponentSchema
    /** Renderer overrides for this instance (`{ TextInput: MyInput }`), on top of `configureAlfakit()`. */
    components?: Record<string, AnyComponent>
    class?: string
    header?: Snippet
    footer?: Snippet
    children?: Snippet<[ContentBlock[]]>
  } = $props()

  const parent = useOptionalAlfakit()

  // Lazy and polled schemas of this component, merged into the page it renders.
  let version = $state(0)
  // The runtime objects are created once from the initial payload; later payloads update
  // them through `setComponent()` and `setEndpoints()` below.
  const live = untrack(() => new StandaloneComponentState(component, () => version++))
  const poll = (target: string, interval: string | number | null | undefined) =>
    live.poll(target, interval)

  const context: AlfakitContextValue = provideAlfakit(
    untrack(() =>
      parent
        ? { ...parent, registry: createStandaloneRegistry(components, parent.registry), poll }
        : createStandaloneContext(
            { action: component.endpoints.action, modal: component.endpoints.modal },
            components,
            poll,
          ),
    ),
  )

  const panel = $derived(standalonePanelSchema(component))
  const page = $derived.by(() => {
    void version
    live.setComponent(component)

    return live.page
  })
  const direction = $derived(component.localization?.direction ?? 'ltr')
  const actionContext = $derived({ token: component.token, component: 'page' })

  provideStandalone({
    get panel() {
      return panel
    },
    get page() {
      return page
    },
  })
  providePageActionContext(untrack(() => ({ token: component.token, component: 'page' })))

  // Endpoints and strings follow the latest payload (they change per locale or path);
  // updated while rendering so children see them on the same update.
  const ready = $derived.by(() => {
    context.actions.setEndpoints({
      action: component.endpoints.action,
      modal: component.endpoints.modal,
    })

    // Inside `createAlfakit()` the panel feeds the shared translator; on a page without the
    // `alfakit` prop (the rest of the app) the component's own translations apply.
    if (!parent || !(inertiaPage.props as Record<string, unknown>).alfakit) {
      context.translator.setTranslations(component.translations ?? {})
      context.translator.setLocale(component.localization?.tag ?? 'en')
    }

    return true
  })

  // Toasts: use the layout's <AlfakitToaster /> when there is one, else the first component
  // on the page renders one (checked after every component mounted).
  let ownsToaster = $state(false)

  onMount(() => {
    ensureStandaloneRuntime()

    if (parent) return

    let release: (() => void) | null = null
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled || hasToaster()) return

      release = claimToaster()
      ownsToaster = true
    })

    return () => {
      cancelled = true
      release?.()
    }
  })

  // Partial reloads (sorting, paging, inline edits) request this component's own prop.
  $effect(() => {
    const name = findStandalonePropName(inertiaPage.props as Record<string, unknown>, component)

    return registerStandaloneProp(name ?? null)
  })

  $effect(() => {
    void component.token
    void live.loadLazy()
  })
</script>

<TooltipProvider delayDuration={0}>
  {#if ready}
    <div
      data-slot="standalone"
      data-alfakit-component={component.class}
      dir={direction}
      class={cn('flex flex-col gap-6', className)}
    >
      {#if page.heading || page.headerActions?.length}
        <header
          data-slot="page-header"
          class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div class="min-w-0">
            {#if page.heading}
              <h2 class="text-xl font-semibold tracking-tight">{page.heading}</h2>
            {/if}
            {#if page.subheading}
              <p class="text-muted-foreground mt-1 text-sm">{page.subheading}</p>
            {/if}
          </div>
          {#if page.headerActions && page.headerActions.length > 0}
            <ActionList
              actions={page.headerActions}
              context={actionContext}
              align="end"
              class="max-w-full shrink-0"
            />
          {/if}
        </header>
      {/if}
      {@render header?.()}
      {#if children}
        {@render children(page.content)}
      {:else}
        {#each page.content as block, blockIndex (uniqueKey(page.content, blockIndex, (item) => item.key))}
          <ContentBlockRenderer {block} />
        {/each}
      {/if}
      {@render footer?.()}
    </div>
    <ActionModals />
    {#if ownsToaster}
      <AlfakitToaster claimed />
    {/if}
  {/if}
</TooltipProvider>
