import type { RichEditorSchema } from '@alfakit/core'
import { lazyComponent } from '../../lib/lazy'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Skeleton } from '../ui/skeleton'

function RichEditorSkeleton({ component }: { component: RichEditorSchema }) {
  const { id, error } = useField<string | null>(component)

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <Skeleton className="h-40 w-full" aria-hidden="true" />
    </FieldWrapper>
  )
}

/** The rich and Markdown editors; Tiptap loads the first time one is shown. */
export const RichEditorField = lazyComponent<{ component: RichEditorSchema }>(
  () => import('./rich-editor').then((module) => module.RichEditorField),
  (props) => <RichEditorSkeleton {...props} />,
)
