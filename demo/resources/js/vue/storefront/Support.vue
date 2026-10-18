<script setup lang="ts">
import { supportLinks, type SupportPageProps } from '@/shared/plugins'
import type { StorefrontShared } from '@/shared/storefront'
import { AlfakitComponent } from '@alfakit/vue'
import { Head, Link, usePage } from '@inertiajs/vue3'
import { computed } from 'vue'
import Layout from './Layout.vue'

/**
 * The helpdesk's customer pages (alfasix/alfakit-helpdesk) at /support, in the shop's layout
 * of the visitor's last storefront.
 */
const props = defineProps<SupportPageProps>()
const page = usePage<StorefrontShared>()
const plugins = computed(() => page.props.plugins)
const links = computed(() => supportLinks(props.meta))
</script>

<template>
    <Layout>
        <Head :title="meta.title">
            <meta name="robots" content="noindex" />
        </Head>
        <section class="mx-auto w-full max-w-3xl px-4 pt-12 pb-16 sm:px-6">
            <h1 class="text-3xl font-bold sm:text-4xl">
                {{ plugins?.copy.support_title ?? meta.title }}
            </h1>
            <p v-if="plugins" class="text-brand-navy/75 mt-4 text-base leading-relaxed">
                {{ plugins.copy.support_intro }}
            </p>
            <nav
                v-if="links.length > 0"
                :aria-label="meta.labels.navigation"
                class="mt-6 flex flex-wrap gap-2 text-sm"
            >
                <Link
                    v-for="link in links"
                    :key="link.href"
                    :href="link.href"
                    :aria-current="link.current ? 'page' : undefined"
                    class="border-brand-navy/15 aria-[current=page]:bg-brand-navy rounded-full border px-3 py-1.5 aria-[current=page]:text-white"
                    >{{ link.label }}</Link
                >
            </nav>
            <div class="mt-8 flex flex-col gap-6">
                <AlfakitComponent
                    v-for="(component, index) in components"
                    :key="`${meta.view}-${index}`"
                    :component="component"
                    class="border-brand-navy/10 rounded-3xl border bg-white p-6 shadow-xs sm:p-8"
                />
            </div>
        </section>
    </Layout>
</template>
