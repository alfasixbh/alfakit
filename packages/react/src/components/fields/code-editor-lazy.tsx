import type { CodeEditorSchema } from '@alfakit/core'
import { lazyComponent } from '../../lib/lazy'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'

/** What the server renders and hydration shows: the code, read-only and unhighlighted. */
function CodeEditorPlaceholder({ component }: { component: CodeEditorSchema }) {
  const { value, id, error } = useField<string | null>(component)

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <pre
        dir="ltr"
        data-slot="code-editor"
        aria-busy="true"
        className="border-input dark:bg-input/30 m-0 overflow-auto rounded-md border p-3 font-mono text-sm leading-6 whitespace-pre"
        style={{
          minHeight: component.minHeight ? `${component.minHeight}px` : undefined,
          maxHeight: component.maxHeight ? `${component.maxHeight}px` : undefined,
        }}
      >
        {typeof value === 'string' ? value : ''}
        {'\n'}
      </pre>
    </FieldWrapper>
  )
}

/** The code editor; its code loads the first time one is shown in the browser. */
export const CodeEditorField = lazyComponent<{ component: CodeEditorSchema }>(
  () => import('./code-editor').then((module) => module.CodeEditorField),
  (props) => <CodeEditorPlaceholder {...props} />,
)
