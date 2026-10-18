import { createAlfakit } from '@alfakit/svelte'
import { components } from './components'
import { pages } from './storefront/pages'

/**
 * Svelte entry: the admin panel at /svelte/admin and the storefront at /svelte. Storefront
 * pages and custom panel components are listed once (./storefront/pages, ./components) and
 * shared with the SSR entry; the React and Vue entries mirror them.
 */
void createAlfakit({ components, pages })
