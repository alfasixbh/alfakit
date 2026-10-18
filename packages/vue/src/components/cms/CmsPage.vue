<script setup lang="ts">
import { CMS_FOOTER_KEY, CMS_HEADER_KEY, cmsPayload, type CmsPayload } from '@alfakit/core'
import { usePage } from '@inertiajs/vue3'
import { EyeIcon } from '@lucide/vue'
import { computed, defineAsyncComponent, watchEffect } from 'vue'
import { useOptionalRegistry, type AnyComponent } from '../../context'
import Breadcrumb from '../ui/Breadcrumb.vue'
import BreadcrumbItem from '../ui/BreadcrumbItem.vue'
import BreadcrumbLink from '../ui/BreadcrumbLink.vue'
import BreadcrumbList from '../ui/BreadcrumbList.vue'
import BreadcrumbPage from '../ui/BreadcrumbPage.vue'
import BreadcrumbSeparator from '../ui/BreadcrumbSeparator.vue'
import CmsBlocks from './CmsBlocks.vue'
import CmsFooter from './CmsFooter.vue'
import CmsHead from './CmsHead.vue'
import CmsHeader from './CmsHeader.vue'
import { provideCms } from './context'

/**
 * The `Alfakit/CmsPage` Inertia page (public CMS pages and previews). Register it in your
 * public site's Inertia app: `createAlfakit({ pages: { 'Alfakit/CmsPage': CmsPage } })`.
 *
 * Replace the header or footer with `cms:header` / `cms:footer` registry components, a
 * block with `cms:block:{type}`, or build your own page from `CmsBlocks` and `CmsHead`.
 */
const props = defineProps<{ cms?: CmsPayload; components?: Record<string, AnyComponent> }>()

function usePageProps(): () => unknown {
  try {
    const page = usePage()

    return () => page.props
  } catch {
    return () => null
  }
}

const pageProps = usePageProps()
const cms = computed(() => props.cms ?? cmsPayload(pageProps()))
const context = provideCms(
  () => cms.value,
  () => props.components,
)
const registry = useOptionalRegistry()
const header = computed<AnyComponent>(() => registry?.resolve(CMS_HEADER_KEY) ?? CmsHeader)
const footer = computed<AnyComponent>(() => registry?.resolve(CMS_FOOTER_KEY) ?? CmsFooter)

const t = (key: string, fallback: string) => context.value.t(key, {}, fallback)

// The admin bar loads only for signed-in editors (the server sends `cms.admin` to them alone).
const CmsAdminBar = defineAsyncComponent(() => import('./AdminBar.vue'))

watchEffect(() => {
  if (typeof document === 'undefined' || !cms.value) return

  document.documentElement.lang = cms.value.site.tag
  document.documentElement.dir = cms.value.site.direction
})
</script>

<template>
  <template v-if="cms">
    <CmsHead :seo="cms.page.seo" />
    <div
      :dir="cms.site.direction"
      :lang="cms.site.tag"
      data-slot="cms-page"
      :data-layout="cms.page.layout ?? undefined"
      class="bg-background text-foreground flex min-h-svh flex-col"
    >
      <a
        href="#cms-content"
        class="bg-background focus-visible:ring-ring/50 sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus-visible:ring-[3px]"
      >
        {{ t('cms.skip_to_content', 'Skip to content') }}
      </a>
      <div
        v-if="cms.preview"
        role="status"
        data-slot="cms-preview-banner"
        class="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"
      >
        <EyeIcon class="size-4 shrink-0" aria-hidden="true" />
        <span>
          <strong class="font-semibold">{{ t('cms.preview', 'Preview') }}</strong> ·
          {{
            t('cms.preview_notice', "This is a preview. Visitors don't see unpublished changes.")
          }}
        </span>
      </div>
      <component :is="header" :cms="cms" />
      <main id="cms-content" tabindex="-1" class="flex-1 outline-none" data-slot="cms-content">
        <Breadcrumb
          v-if="cms.page.breadcrumbs.length > 1"
          :aria-label="t('cms.breadcrumbs', 'Breadcrumbs')"
          class="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8"
        >
          <BreadcrumbList>
            <template v-for="(crumb, index) in cms.page.breadcrumbs" :key="crumb.url">
              <BreadcrumbSeparator v-if="index > 0" />
              <BreadcrumbItem>
                <BreadcrumbPage v-if="index === cms.page.breadcrumbs.length - 1">{{
                  crumb.label
                }}</BreadcrumbPage>
                <BreadcrumbLink v-else :href="crumb.url">{{ crumb.label }}</BreadcrumbLink>
              </BreadcrumbItem>
            </template>
          </BreadcrumbList>
        </Breadcrumb>
        <slot :cms="cms">
          <CmsBlocks v-if="cms.page.blocks.length > 0" :blocks="cms.page.blocks" />
          <p v-else class="text-muted-foreground mx-auto max-w-3xl px-4 py-24 text-center">
            {{ t('cms.empty_page', 'This page has no content yet.') }}
          </p>
        </slot>
      </main>
      <component :is="footer" :cms="cms" />
      <!-- eslint-disable-next-line vue/no-v-html -- built on the server (Credit::poweredBy) -->
      <div v-if="cms.poweredBy" data-slot="cms-powered-by" v-html="cms.poweredBy" />
      <CmsAdminBar v-if="cms.admin" :admin="cms.admin" />
    </div>
  </template>
</template>
