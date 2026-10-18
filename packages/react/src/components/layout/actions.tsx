import type { ActionsComponentSchema } from '@alfakit/core'
import { extraProps } from '../../lib/attributes'
import { cn } from '../../lib/utils'
import { ActionList } from '../actions/action-list'
import { useFieldActionContext } from '../schema/field-actions'

const JUSTIFY: Record<string, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  justify: 'justify-between',
}

const VERTICAL: Record<string, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
}

/**
 * `Actions::make([...])`: a row of buttons placed freely in a form or infolist. They run in
 * the component's field context, so `$set()` in an action updates the surrounding form.
 */
export function ActionsComponent({ component }: { component: ActionsComponentSchema }) {
  const context = useFieldActionContext(component)
  const stretch = component.fullWidth || component.alignment === 'justify'

  return (
    <div
      data-slot="schema-actions"
      data-alignment={component.alignment ?? 'start'}
      {...extraProps(
        component.extraAttributes,
        cn(
          'flex h-full flex-col',
          component.verticalAlignment && VERTICAL[component.verticalAlignment],
        ),
      )}
    >
      <ActionList
        actions={component.actions ?? []}
        context={context}
        className={cn('w-full', JUSTIFY[component.alignment ?? 'start'], stretch && '[&>*]:flex-1')}
      />
    </div>
  )
}
