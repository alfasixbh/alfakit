import type { ViewEntrySchema } from '@alfakit/core'
import { createElement } from 'react'
import { useRegistry, useT } from '../../context'
import { EntryWrapper } from './entry-wrapper'

/** `ViewEntry`: the application component registered under the entry's `view()` name. */
export function ViewEntryComponent({ component }: { component: ViewEntrySchema }) {
  const t = useT()
  const name = component.component ?? ''
  const Custom = useRegistry().resolve(name)

  return (
    <EntryWrapper entry={component}>
      {name && Custom ? (
        createElement(Custom, { ...(component.props ?? {}), state: component.state, component })
      ) : (
        <span className="text-destructive text-xs">
          {t(
            'component_not_registered',
            { component: name },
            `Component ${name} is not registered.`,
          )}
        </span>
      )}
    </EntryWrapper>
  )
}
