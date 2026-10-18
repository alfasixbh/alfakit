import type { CmsStorefrontPageProps } from '@/shared/plugins'
import { CmsPage as AlfakitCmsPage } from '@alfakit/react'
import Layout from './Layout'

/**
 * A storefront page managed with alfasix/alfakit-cms: the blocks, SEO, breadcrumbs, the
 * preview banner and (for signed-in staff) the editing bar, inside the shop's layout. The
 * CMS header and footer are replaced by the shop's own (`cms:header` / `cms:footer` in
 * ../components). Previews from the panel's live preview render this page too.
 */
export default function CmsPage({ cms }: CmsStorefrontPageProps) {
    return (
        <Layout>
            <div data-slot="storefront-cms">
                {/* The shop's footer already shows the "Powered by" line (`storefront.credit`). */}
                <AlfakitCmsPage cms={{ ...cms, poweredBy: null }} />
            </div>
        </Layout>
    )
}
