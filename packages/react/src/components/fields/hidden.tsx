import type { HiddenSchema } from '@alfakit/core'
import { useField } from '../form/form-context'

export function HiddenField({ component }: { component: HiddenSchema }) {
  const { value, id } = useField<string | number | null>(component)

  return <input type="hidden" id={id} name={component.name} value={value ?? ''} readOnly />
}
