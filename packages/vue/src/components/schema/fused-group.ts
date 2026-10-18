import { inject, provide, type InjectionKey } from 'vue'

const FUSED_GROUP: InjectionKey<boolean> = Symbol('alfakit-fused-group')

/**
 * Set by `FusedGroup`: fields inside render only their control (labels become
 * screen-reader text, helper text and errors are shown by the group).
 */
export function provideFusedGroup(): void {
  provide(FUSED_GROUP, true)
}

export function useInFusedGroup(): boolean {
  return inject(FUSED_GROUP, false)
}
