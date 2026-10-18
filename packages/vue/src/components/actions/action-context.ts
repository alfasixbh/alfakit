import type { ActionContext } from '@alfakit/core'
import { inject, provide, type InjectionKey } from 'vue'
import { usePageSchema } from '../../context'

export const PAGE_ACTION_KEY: InjectionKey<ActionContext> = Symbol('alfakit.page-action')

/** Provides the page-level action context (token + `page` component) to nested components. */
export function providePageActionContext(value: ActionContext): void {
  provide(PAGE_ACTION_KEY, value)
}

export function usePageActionContext(): ActionContext {
  const context = inject(PAGE_ACTION_KEY, null)
  const page = usePageSchema()

  return context ?? { token: page.value?.token ?? '', component: 'page' }
}
