import { createAlfakit } from '@alfakit/react'
import { components } from './components'
import { pages } from './storefront/pages'

/**
 * React entry: the admin panel at /react/admin and the storefront at /react. Storefront pages
 * and custom panel components are listed once (./storefront/pages, ./components) and shared
 * with the SSR entry; the Vue and Svelte entries mirror them.
 */
void createAlfakit({ components, pages })
