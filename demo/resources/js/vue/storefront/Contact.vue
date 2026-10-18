<script setup lang="ts">
import { AlfakitComponent } from '@alfakit/vue'
import { Head, usePage } from '@inertiajs/vue3'
import type { ContactPageProps } from '@/shared/shop'
import type { StorefrontShared } from '@/shared/storefront'
import Layout from './Layout.vue'

/**
 * Contact page: the boutique's details beside a guest standalone Form (validated, rate limited).
 */
defineProps<ContactPageProps>()

const page = usePage<StorefrontShared>()
</script>

<template>
    <Layout>
        <Head :title="`${copy.heading} · ${page.props.storefront.brand}`" />

        <section class="mx-auto w-full max-w-6xl px-4 pt-12 pb-16 sm:px-6">
            <h1 class="text-3xl font-bold sm:text-4xl">{{ copy.heading }}</h1>
            <p class="text-brand-navy/75 mt-4 max-w-2xl text-base leading-relaxed">
                {{ copy.intro }}
            </p>

            <div class="mt-10 grid gap-8 lg:grid-cols-[2fr_3fr]">
                <aside class="border-brand-navy/10 h-fit rounded-3xl border bg-white p-6 shadow-xs">
                    <h2 class="text-lg font-bold">{{ store?.name ?? copy.details.heading }}</h2>
                    <dl class="text-brand-navy/80 mt-4 space-y-3 text-sm">
                        <div v-if="store?.email">
                            <dt class="text-brand-navy/55 text-[11px] tracking-[0.2em] uppercase">
                                {{ copy.details.email }}
                            </dt>
                            <dd class="mt-0.5">
                                <a
                                    :href="`mailto:${store.email}`"
                                    class="hover:text-brand-orange"
                                    >{{ store.email }}</a
                                >
                            </dd>
                        </div>
                        <div v-if="store?.phone">
                            <dt class="text-brand-navy/55 text-[11px] tracking-[0.2em] uppercase">
                                {{ copy.details.phone }}
                            </dt>
                            <dd class="mt-0.5" dir="ltr">{{ store.phone }}</dd>
                        </div>
                        <div>
                            <dt class="text-brand-navy/55 text-[11px] tracking-[0.2em] uppercase">
                                {{ copy.details.hours }}
                            </dt>
                            <dd class="mt-0.5">{{ copy.details.hours_value }}</dd>
                        </div>
                        <div>
                            <dt class="text-brand-navy/55 text-[11px] tracking-[0.2em] uppercase">
                                {{ copy.details.heading }}
                            </dt>
                            <dd class="mt-0.5">
                                {{ copy.details.address
                                }}<template v-if="store?.country">, {{ store.country }}</template>
                            </dd>
                        </div>
                    </dl>
                </aside>

                <section
                    class="border-brand-navy/10 rounded-3xl border bg-white p-6 shadow-xs sm:p-8"
                >
                    <h2 class="text-lg font-bold">{{ copy.form_heading }}</h2>
                    <p class="text-brand-navy/60 mt-1 mb-6 text-sm">{{ copy.form_help }}</p>
                    <AlfakitComponent :component="form" />
                </section>
            </div>
        </section>
    </Layout>
</template>
