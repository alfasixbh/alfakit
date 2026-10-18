<script setup lang="ts">
import type { FormPageProps } from '@/shared/plugins'
import { AlfakitComponent } from '@alfakit/vue'
import { Head } from '@inertiajs/vue3'
import Layout from './Layout.vue'

/** A published form of alfasix/alfakit-forms at /forms/{slug}, in the shop's layout. */
defineProps<FormPageProps>()
</script>

<template>
    <Layout>
        <Head :title="meta.title">
            <meta v-if="meta.description" name="description" :content="meta.description" />
            <meta v-if="meta.preview" name="robots" content="noindex" />
        </Head>
        <section class="mx-auto w-full max-w-3xl px-4 pt-12 pb-16 sm:px-6">
            <AlfakitComponent
                :component="form"
                class="border-brand-navy/10 rounded-3xl border bg-white p-6 shadow-xs sm:p-8"
            />
        </section>
    </Layout>
</template>
