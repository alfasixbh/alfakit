import { panelPages } from '../pages'
import CmsPage from './CmsPage.vue'
import Contact from './Contact.vue'
import Form from './Form.vue'
import Home from './Home.vue'
import Product from './Product.vue'
import Support from './Support.vue'
import Track from './Track.vue'
import Wholesale from './Wholesale.vue'

/** Storefront pages, registered under the same names in the React and Svelte entries. */
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
    // App pages of the panel (resources/js/vue/pages), shared with the SSR entry the same way.
    ...panelPages,
}
