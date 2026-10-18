import type { DeferredBadgeSchema, FormState } from '@alfakit/core'
import { createStore, loadDeferredBadge, reportRequestError } from '@alfakit/core'
import { onMounted, onScopeDispose, ref, type Ref } from 'vue'
import { usePanel } from '../../context'
import { usePageActionContext } from '../actions/action-context'
import { useOptionalFormStore } from '../form/form-context'

/** Stands in for the form store outside forms (infolists). */
export const emptyFormState = createStore<Pick<FormState, 'errors'>>({ errors: {} })

/**
 * `Tab::deferBadge()`: the tab's badge, loaded after mounting (so SSR renders the tab
 * without it). Non-deferred tabs return their own badge.
 */
export function useDeferredBadge(tab: {
  key: string
  badgeDeferred?: boolean
  badge?: string | number
  badgeColor?: string
  badgeTooltip?: string
}): Ref<DeferredBadgeSchema> {
  const form = useOptionalFormStore()
  const panel = usePanel()
  const page = usePageActionContext()
  const badge = ref<DeferredBadgeSchema>(
    tab.badgeDeferred
      ? {}
      : { badge: tab.badge, badgeColor: tab.badgeColor, badgeTooltip: tab.badgeTooltip },
  )
  const controller = typeof AbortController === 'undefined' ? null : new AbortController()

  onMounted(() => {
    const url = panel.value?.endpoints?.schemaDeferred

    if (!tab.badgeDeferred || !url) return

    loadDeferredBadge({
      url,
      token: page.token,
      key: tab.key,
      form,
      signal: controller?.signal,
    })
      .then((loaded) => {
        badge.value = loaded
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') reportRequestError(error)
      })
  })

  onScopeDispose(() => controller?.abort())

  return badge
}
