import { getContext, setContext } from 'svelte'

const FUSED_GROUP = Symbol('alfakit-fused-group')

/**
 * Set by `FusedGroup`: fields inside render only their control (labels become
 * screen-reader text, helper text and errors are shown by the group).
 */
export function setFusedGroup(): void {
  setContext(FUSED_GROUP, true)
}

export function useInFusedGroup(): boolean {
  return getContext<boolean | undefined>(FUSED_GROUP) ?? false
}
