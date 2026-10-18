import type { CSSProperties } from 'react'
import { cn } from './utils'

/** HTML attribute names that React spells differently (e.g. `tabindex` → `tabIndex`). */
const REACT_PROP_NAMES: Record<string, string> = {
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  minlength: 'minLength',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  autocapitalize: 'autoCapitalize',
  autocorrect: 'autoCorrect',
  spellcheck: 'spellCheck',
  inputmode: 'inputMode',
  enterkeyhint: 'enterKeyHint',
  contenteditable: 'contentEditable',
  crossorigin: 'crossOrigin',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
}

/**
 * Turn attributes from PHP (`extraAttributes(['class' => '…', 'style' => '…'])`) into React
 * props: `class` is merged with the component's own classes instead of replacing them,
 * a `style` string becomes a style object, `for` becomes `htmlFor` and other HTML names
 * React spells differently (`tabindex`, `readonly`, …) are renamed.
 */
export function extraProps(
  attributes: Record<string, unknown> | null | undefined,
  className?: string,
): Record<string, unknown> {
  const {
    class: classAttribute,
    className: classNameAttribute,
    style,
    for: htmlFor,
    ...rest
  } = attributes ?? {}

  const renamed: Record<string, unknown> = {}

  for (const [name, value] of Object.entries(rest)) {
    renamed[REACT_PROP_NAMES[name] ?? name] = value
  }

  const props: Record<string, unknown> = {
    ...renamed,
    className: cn(className, classAttribute as string, classNameAttribute as string) || undefined,
  }

  if (htmlFor !== undefined) props.htmlFor = htmlFor
  if (style !== undefined) props.style = typeof style === 'string' ? parseStyle(style) : style

  return props
}

export function parseStyle(style: string): CSSProperties {
  const result: Record<string, string> = {}

  for (const declaration of style.split(';')) {
    const index = declaration.indexOf(':')

    if (index === -1) continue

    const property = declaration.slice(0, index).trim()
    const value = declaration.slice(index + 1).trim()

    if (!property || !value) continue

    const key = property.startsWith('--')
      ? property
      : property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())

    result[key] = value
  }

  return result as CSSProperties
}
