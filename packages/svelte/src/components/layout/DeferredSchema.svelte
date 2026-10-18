<script lang="ts" generics="T extends SchemaComponent">
  import type { FormState, SchemaComponent } from '@alfakit/core'
  import {
    createStore,
    deferredHasErrors,
    isDeferredPlaceholder,
    loadDeferredComponent,
    mergeDeferredComponent,
    reportRequestError,
    whenVisible,
  } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import { onDestroy } from 'svelte'
  import { usePanel, useT } from '../../context.svelte'
  import { useStoreSelector } from '../../hooks/store.svelte'
  import { cn } from '../../lib/utils'
  import { usePageActionContext } from '../actions/action-context'
  import { useOptionalFormStore } from '../form/form-context.svelte'
  import { Skeleton } from '../ui/skeleton'

  /**
   * `deferLoading()`: a skeleton until the placeholder scrolls into view (or a field
   * inside has an error), then `children` with the loaded component. Inside a form the
   * loaded component is merged into the form's tree. SSR renders the skeleton.
   */
  let {
    component,
    class: className,
    children,
  }: { component: T; class?: string; children: Snippet<[T]> } = $props()

  const form = useOptionalFormStore()
  const panel = usePanel()
  const page = usePageActionContext()
  const t = useT()
  const errors = useStoreSelector(
    form?.store ?? createStore<Pick<FormState, 'errors'>>({ errors: {} }),
    (state) => state.errors,
  )

  let element = $state<HTMLElement | null>(null)
  let loaded = $state.raw<T | null>(null)
  let started = false
  const controller = typeof AbortController === 'undefined' ? null : new AbortController()

  const resolved = $derived(isDeferredPlaceholder(component) && loaded ? loaded : component)
  const deferred = $derived(isDeferredPlaceholder(resolved))
  const hasErrors = $derived(deferred && deferredHasErrors(component, errors.current))

  function load(): void {
    const url = panel?.endpoints?.schemaDeferred

    if (started || !url || !deferred) return

    started = true

    loadDeferredComponent<T>({
      url,
      token: page.token,
      key: component.key,
      form,
      signal: controller?.signal,
    })
      .then((full) => {
        if (!form || !mergeDeferredComponent(form, full)) loaded = full
      })
      .catch((error: Error) => {
        started = false
        if (error.name !== 'AbortError') reportRequestError(error)
      })
  }

  $effect(() => {
    if (!deferred) return

    if (hasErrors) {
      load()

      return
    }

    return whenVisible(element, load)
  })

  onDestroy(() => controller?.abort())
</script>

{#if deferred}
  <div
    bind:this={element}
    data-slot="deferred-schema"
    role="status"
    aria-busy="true"
    class={cn('flex flex-col gap-3', className)}
  >
    <span class="sr-only">{t('loading', {}, 'Loading…')}</span>
    <Skeleton class="h-4 w-1/4" />
    <Skeleton class="h-9 w-full" />
    <Skeleton class="h-9 w-2/3" />
  </div>
{:else}
  {@render children(resolved)}
{/if}
