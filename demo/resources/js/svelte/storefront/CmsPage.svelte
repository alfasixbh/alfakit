<script lang="ts">
    import type { CmsStorefrontPageProps } from '@/shared/plugins'
    import { CmsPage as AlfakitCmsPage } from '@alfakit/svelte'
    import Layout from './Layout.svelte'

    /**
     * A storefront page managed with alfasix/alfakit-cms inside the shop's layout (the CMS
     * header and footer are replaced by the shop's own: `cms:header` / `cms:footer`).
     */
    let { cms }: CmsStorefrontPageProps = $props()
</script>

<Layout>
    <div data-slot="storefront-cms">
        <!-- The shop's footer already shows the "Powered by" line (`storefront.credit`). -->
        <AlfakitCmsPage cms={{ ...cms, poweredBy: null }} />
    </div>
</Layout>
