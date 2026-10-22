/**
 * Drop-in header components of starter kit mode (`Panel::starterKit()`): AlfaKit's search,
 * notifications bell, tenant switcher and language switcher in the host's own header, on every page of the
 * application. They read the shared `alfakitNavigation` prop, render a lightweight trigger
 * straight away, and load their code and the panel data once mounted (never during SSR).
 *
 * ```svelte
 * <script lang="ts">
 *   import { AlfakitCopilot, AlfakitLanguageSwitcher, AlfakitNotifications, AlfakitSearch } from '@alfakit/svelte'
 * </script>
 *
 * <AlfakitSearch />
 * <AlfakitNotifications />
 * <AlfakitCopilot />
 * <AlfakitLanguageSwitcher />
 * ```
 */
export { default as AlfakitCopilot } from './AlfakitCopilot.svelte'
export { default as AlfakitLanguageSwitcher } from './AlfakitLanguageSwitcher.svelte'
export { default as AlfakitNotifications } from './AlfakitNotifications.svelte'
export { default as AlfakitSearch } from './AlfakitSearch.svelte'
export { default as AlfakitTenantSwitcher } from './AlfakitTenantSwitcher.svelte'
