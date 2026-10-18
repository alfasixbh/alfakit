<script setup lang="ts">
import type { CmsStorefrontPageProps } from '@/shared/plugins'
import { CmsPage as AlfakitCmsPage } from '@alfakit/vue'
import Layout from './Layout.vue'

/**
 * A storefront page managed with alfasix/alfakit-cms inside the shop's layout (the CMS header
 * and footer are replaced by the shop's own: `cms:header` / `cms:footer` in ../components).
 */
defineProps<CmsStorefrontPageProps>()
</script>

<template>
    <Layout>
        <div data-slot="storefront-cms">
            <!-- The shop's footer already shows the "Powered by" line (`storefront.credit`). -->
            <AlfakitCmsPage :cms="{ ...cms, poweredBy: null }" />
        </div>
    </Layout>
</template>
