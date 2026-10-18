import type { StandaloneDefaults } from '@alfakit/core'
import type { AnyComponent } from '../context'

let defaults: StandaloneDefaults<AnyComponent> = {}

/**
 * Global defaults for every `<AlfakitComponent>` of the application, for pages outside a
 * panel (no `createAlfakit()`). Call it once in your app entry:
 *
 * ```tsx
 * configureAlfakit({ components: { TextInput: MyInput, 'map-picker': MapPicker } })
 * ```
 */
export function configureAlfakit(options: StandaloneDefaults<AnyComponent>): void {
  defaults = {
    ...defaults,
    ...options,
    components: { ...defaults.components, ...options.components },
  }
}

export function getStandaloneDefaults(): StandaloneDefaults<AnyComponent> {
  return defaults
}
