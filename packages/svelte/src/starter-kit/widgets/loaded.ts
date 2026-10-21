/**
 * The loaded header components, in one module: they mount together in the host's header,
 * so one request brings them all, and a host bundle doesn't pay for a chunk per component.
 * Only loaded in the browser (`import('./loaded')`).
 */
export { default as LoadedCopilot } from './LoadedCopilot.svelte'
export { default as LoadedNotifications } from './LoadedNotifications.svelte'
export { default as LoadedSearch } from './LoadedSearch.svelte'
export { default as LoadedTenantSwitcher } from './LoadedTenantSwitcher.svelte'
