import { fieldIds, iconPickerPreview, type IconPickerSchema } from '@alfakit/core'
import { ChevronsUpDownIcon } from 'lucide-react'
import { lazyComponent } from '../../lib/lazy'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { IconPickerValue } from './icon-picker-value'

/** What the server renders and hydration shows: the selected icon, not yet interactive. */
function IconPickerPlaceholder({ component }: { component: IconPickerSchema }) {
  const { value, id, error, aria } = useField<string | null>(component)
  const current = typeof value === 'string' && value !== '' ? value : null

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <div data-slot="icon-picker" className="flex items-center gap-2">
        <button
          id={id}
          type="button"
          disabled
          aria-busy="true"
          data-slot="icon-picker-trigger"
          data-input=""
          {...aria}
          aria-labelledby={`${fieldIds(id).label} ${id}-value`}
          className="border-input dark:bg-input/30 flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border bg-transparent px-3 text-start text-sm shadow-xs"
        >
          <IconPickerValue
            id={`${id}-value`}
            component={component}
            value={current}
            preview={iconPickerPreview(component.selected, current)}
          />
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
        </button>
      </div>
    </FieldWrapper>
  )
}

/** The icon picker; its code loads the first time one is shown in the browser. */
export const IconPickerField = lazyComponent<{ component: IconPickerSchema }>(
  () => import('./icon-picker').then((module) => module.IconPickerField),
  (props) => <IconPickerPlaceholder {...props} />,
)
