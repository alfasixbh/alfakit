import type { FieldSchema, ModalTableSelectSchema, QueryBuilderRulesSchema } from '@alfakit/core'
import { lazyComponent } from '../../lib/lazy'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Skeleton } from '../ui/skeleton'

/** What the server renders and hydration shows for a field whose code loads on first use. */
function FieldPlaceholder({ component, height }: { component: FieldSchema; height: string }) {
  const { id, error } = useField<unknown>(component)

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <Skeleton aria-busy="true" data-slot="field-placeholder" className={height} />
    </FieldWrapper>
  )
}

/** `ModalTableSelect`; its code (the picker's table) loads the first time one is shown. */
export const ModalTableSelectField = lazyComponent<{ component: ModalTableSelectSchema }>(
  () => import('./modal-table-select').then((module) => module.ModalTableSelectField),
  ({ component }) => <FieldPlaceholder component={component} height="h-9" />,
)

/** The query builder filter's rules; its code loads the first time one is shown. */
export const QueryBuilderRulesField = lazyComponent<{ component: QueryBuilderRulesSchema }>(
  () => import('./query-builder-rules').then((module) => module.QueryBuilderRulesField),
  ({ component }) => (
    <FieldPlaceholder component={component as unknown as FieldSchema} height="h-24" />
  ),
)
