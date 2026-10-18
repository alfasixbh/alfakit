import { panelPages } from '../pages'
import CmsPage from './CmsPage'
import Contact from './Contact'
import Form from './Form'
import Home from './Home'
import Product from './Product'
import Support from './Support'
import Track from './Track'
import Wholesale from './Wholesale'

/** Storefront pages, registered under the same names in the Vue and Svelte entries. */
export const pages = {
    'Storefront/Home': Home,
    'Storefront/Product': Product,
    'Storefront/Contact': Contact,
    'Storefront/Track': Track,
    // First-party plugin pages: CMS pages, wholesale form, helpdesk portal, public forms.
    'Storefront/CmsPage': CmsPage,
    'Storefront/Wholesale': Wholesale,
    'Storefront/Support': Support,
    'Storefront/Form': Form,
    // App pages of the panel (resources/js/react/pages), shared with the SSR entry the same way.
    ...panelPages,
}
