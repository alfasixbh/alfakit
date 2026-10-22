/**
 * The loaded header components, in one module: they mount together in the host's header,
 * so one request brings them all, and a host bundle doesn't pay for a chunk per component.
 * Only loaded in the browser (`import('./loaded')`).
 */
export { default as LoadedCopilot } from './LoadedCopilot.vue'
export { default as LoadedLanguageSwitcher } from './LoadedLanguageSwitcher.vue'
export { default as LoadedNotifications } from './LoadedNotifications.vue'
export { default as LoadedSearch } from './LoadedSearch.vue'
export { default as LoadedTenantSwitcher } from './LoadedTenantSwitcher.vue'
