<script setup lang="ts">
import type { WholesalePageProps } from '@/shared/plugins'
import type { StorefrontShared } from '@/shared/storefront'
import { AlfakitComponent } from '@alfakit/vue'
import { Head, usePage } from '@inertiajs/vue3'
import { computed } from 'vue'
import Layout from './Layout.vue'

/** The wholesale enquiry form, built in the panel with alfasix/alfakit-forms. */
defineProps<WholesalePageProps>()
const page = usePage<StorefrontShared>()
const brand = computed(() => page.props.storefront.brand)
</script>

<template>
    <Layout>
        <Head :title="`${copy.wholesale_title} · ${brand}`" />
        <section class="mx-auto w-full max-w-3xl px-4 pt-12 pb-16 sm:px-6">
            <h1 class="text-3xl font-bold sm:text-4xl">{{ copy.wholesale_title }}</h1>
            <p class="text-brand-navy/75 mt-4 text-base leading-relaxed">
                {{ copy.wholesale_intro }}
            </p>
            <div class="border-brand-navy/10 mt-8 rounded-3xl border bg-white p-6 shadow-xs sm:p-8">
                <AlfakitComponent v-if="form" :component="form" />
                <p v-else class="text-brand-navy/70 text-sm">{{ copy.wholesale_unavailable }}</p>
            </div>
        </section>
    </Layout>
</template>
