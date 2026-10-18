import type { ActionContext } from '@alfakit/core'
import { createContext, useContext, type ReactNode } from 'react'
import { usePageSchema } from '../../context'

const PageActionContext = createContext<ActionContext | null>(null)

/** Provides the page-level action context (token + `page` component) to nested components. */
export function PageActionProvider({
  value,
  children,
}: {
  value: ActionContext
  children: ReactNode
}) {
  return <PageActionContext.Provider value={value}>{children}</PageActionContext.Provider>
}

export function usePageActionContext(): ActionContext {
  const context = useContext(PageActionContext)
  const page = usePageSchema()

  return context ?? { token: page?.token ?? '', component: 'page' }
}
