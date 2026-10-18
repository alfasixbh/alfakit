import { createAlfakit } from '@alfakit/vue'
import { components } from './components'
import { pages } from './storefront/pages'

/**
 * Vue entry: the admin panel at /vue/admin and the storefront at /vue. Storefront pages and
 * custom panel components are listed once (./storefront/pages, ./components) and shared with
 * the SSR entry; the React and Svelte entries mirror them.
 */
void createAlfakit({ components, pages })
