import { panelPages } from '../pages'
import CmsPage from './CmsPage.svelte'
import Contact from './Contact.svelte'
import Form from './Form.svelte'
import Home from './Home.svelte'
import Product from './Product.svelte'
import Support from './Support.svelte'
import Track from './Track.svelte'
import Wholesale from './Wholesale.svelte'

/** Storefront pages, registered under the same names in the React and Vue entries. */
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
    // App pages of the panel (resources/js/svelte/pages), shared with the SSR entry the same way.
    ...panelPages,
}
