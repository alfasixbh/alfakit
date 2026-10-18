/** A reactive props object: assigning to it re-renders the component that spreads it. */
export function reactiveProps<T extends Record<string, unknown>>(initial: T): T {
  const props = $state(initial)

  return props
}
