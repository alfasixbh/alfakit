import { createContext, useContext } from 'react'

/**
 * Set by `FusedGroup`: fields inside render only their control (labels become
 * screen-reader text, helper text and errors are shown by the group).
 */
export const FusedGroupContext = createContext(false)

export function useInFusedGroup(): boolean {
  return useContext(FusedGroupContext)
}
