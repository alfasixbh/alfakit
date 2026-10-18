import type { DeferredBadgeSchema, SchemaComponent } from '@alfakit/core'
import {
  createStore,
  deferredHasErrors,
  isDeferredPlaceholder,
  loadDeferredBadge,
  loadDeferredComponent,
  mergeDeferredComponent,
  reportRequestError,
  whenVisible,
  type FormState,
} from '@alfakit/core'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { usePanel, useT } from '../../context'
import { useStoreSelector } from '../../hooks/use-store'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import { useOptionalFormStore } from '../form/form-context'
import { Skeleton } from '../ui/skeleton'

const emptyFormState = createStore<Pick<FormState, 'errors'>>({ errors: {} })

/**
 * `deferLoading()`: while `component` is a placeholder, returns it unchanged with a `ref`
 * for the skeleton; once the skeleton is in view (or a field inside has an error) the
 * component is loaded and returned in full. Inside a form it is merged into the form's
 * tree, so live fields inside work as usual. SSR renders the skeleton.
 */
export function useDeferredComponent<T extends SchemaComponent>(
  component: T,
): { component: T; deferred: boolean; ref: RefObject<HTMLDivElement | null> } {
  const form = useOptionalFormStore()
  const panel = usePanel()
  const page = usePageActionContext()
  const ref = useRef<HTMLDivElement | null>(null)
  const [loaded, setLoaded] = useState<T | null>(null)
  const placeholder = isDeferredPlaceholder(component)
  const hasErrors = useStoreSelector(form?.store ?? emptyFormState, (state) =>
    placeholder ? deferredHasErrors(component, state.errors) : false,
  )
  const url = panel?.endpoints?.schemaDeferred

  useEffect(() => {
    if (!placeholder || loaded || !url) return

    let cancelled = false
    const controller = new AbortController()

    const load = () => {
      loadDeferredComponent<T>({
        url,
        token: page.token,
        key: component.key,
        form,
        signal: controller.signal,
      })
        .then((full) => {
          if (cancelled) return
          // In a form, the store's tree is updated and `component` arrives in full.
          if (!form || !mergeDeferredComponent(form, full)) setLoaded(full)
        })
        .catch((error: Error) => {
          if (error.name !== 'AbortError') reportRequestError(error)
        })
    }

    const stop = hasErrors ? (load(), () => {}) : whenVisible(ref.current, load)

    return () => {
      cancelled = true
      stop()
      controller.abort()
    }
  }, [placeholder, loaded, url, hasErrors, component.key, form, page.token])

  const resolved = placeholder && loaded ? loaded : component

  return { component: resolved, deferred: isDeferredPlaceholder(resolved), ref }
}

/** The skeleton of a deferred child schema. */
export function DeferredSkeleton({
  ref,
  className,
}: {
  ref: RefObject<HTMLDivElement | null>
  className?: string
}) {
  const t = useT()

  return (
    <div
      ref={ref}
      data-slot="deferred-schema"
      role="status"
      aria-busy="true"
      className={cn('flex flex-col gap-3', className)}
    >
      <span className="sr-only">{t('loading', {}, 'Loading…')}</span>
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-2/3" />
    </div>
  )
}

/**
 * `Tab::deferBadge()`: the tab's badge, loaded after the page rendered. Returns the
 * tab's own badge when it isn't deferred.
 */
export function useDeferredBadge(tab: {
  key: string
  badgeDeferred?: boolean
  badge?: string | number
  badgeColor?: string
  badgeTooltip?: string
}): DeferredBadgeSchema {
  const form = useOptionalFormStore()
  const panel = usePanel()
  const page = usePageActionContext()
  const [badge, setBadge] = useState<DeferredBadgeSchema | null>(null)
  const url = panel?.endpoints?.schemaDeferred

  useEffect(() => {
    if (!tab.badgeDeferred || !url) return

    const controller = new AbortController()

    loadDeferredBadge({ url, token: page.token, key: tab.key, form, signal: controller.signal })
      .then(setBadge)
      .catch((error: Error) => {
        if (error.name !== 'AbortError') reportRequestError(error)
      })

    return () => controller.abort()
  }, [tab.badgeDeferred, tab.key, url, form, page.token])

  if (tab.badgeDeferred) return badge ?? {}

  return { badge: tab.badge, badgeColor: tab.badgeColor, badgeTooltip: tab.badgeTooltip }
}

/** Renders `children(component)` once a deferred component has loaded, a skeleton before. */
export function DeferredSchema<T extends SchemaComponent>({
  component,
  className,
  children,
}: {
  component: T
  className?: string
  children: (component: T) => ReactNode
}) {
  const { component: resolved, deferred, ref } = useDeferredComponent(component)

  return deferred ? <DeferredSkeleton ref={ref} className={className} /> : <>{children(resolved)}</>
}
