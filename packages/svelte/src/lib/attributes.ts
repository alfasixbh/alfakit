import { cn } from './utils'

/**
 * Attributes from PHP (`extraAttributes(['class' => '…'])`, `extraInputAttributes`, …) as
 * spreadable props: `class` is merged with the component's own classes instead of
 * replacing them. Svelte accepts `style` strings and `for` as-is, so everything else passes
 * through. Spread the result in place of a `class=` attribute.
 */
export function extraProps(
  attributes: Record<string, unknown> | null | undefined,
  className?: string | false | null,
): Record<string, unknown> {
  const { class: classAttribute, ...rest } = attributes ?? {}

  return {
    ...rest,
    class:
      cn(className || undefined, typeof classAttribute === 'string' ? classAttribute : undefined) ||
      undefined,
  }
}
