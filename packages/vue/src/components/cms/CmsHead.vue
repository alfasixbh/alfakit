<script setup lang="ts">
import { cmsDesignLinks, cmsHeadTags, type CmsSeoSchema, type CmsSiteDesign } from '@alfakit/core'
import { Head } from '@inertiajs/vue3'
import { computed } from 'vue'

/**
 * The page's `<title>`, meta, canonical, `hreflang` and JSON-LD tags, plus the site
 * design's favicon and fonts, through Inertia's `<Head>` (server-rendered with SSR,
 * updated on every visit).
 */
const props = defineProps<{
  seo: CmsSeoSchema | null | undefined
  design?: CmsSiteDesign | null
}>()

const tags = computed(() => cmsHeadTags(props.seo))
const designLinks = computed(() => cmsDesignLinks(props.design))
</script>

<template>
  <Head :title="tags.title">
    <template v-for="tag in tags.meta" :key="tag.property ?? tag.name">
      <meta
        v-if="tag.property"
        :head-key="`cms:${tag.property}`"
        :property="tag.property"
        :content="tag.content"
      />
      <meta v-else :head-key="`cms:${tag.name}`" :name="tag.name" :content="tag.content" />
    </template>
    <link
      v-for="link in tags.links"
      :key="`${link.rel}:${link.hreflang ?? ''}:${link.href}`"
      :head-key="`cms:${link.rel}:${link.hreflang ?? ''}`"
      :rel="link.rel"
      :href="link.href"
      :hreflang="link.hreflang"
    />
    <link
      v-for="link in designLinks"
      :key="`design:${link.rel}`"
      :head-key="`cms:design:${link.rel}`"
      :rel="link.rel"
      :href="link.href"
    />
    <!-- Encoded on the server with `<` escaped, so it can't close the element. -->
    <component :is="'script'" v-if="tags.jsonLd" head-key="cms:jsonld" type="application/ld+json">{{
      tags.jsonLd
    }}</component>
  </Head>
</template>
