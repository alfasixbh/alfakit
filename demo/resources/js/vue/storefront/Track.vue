<script setup lang="ts">
import { AlfakitComponent } from '@alfakit/vue'
import { Head, router, usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import type { TrackPageProps } from '@/shared/shop'
import { storefrontLinks, type StorefrontShared } from '@/shared/storefront'
import Layout from './Layout.vue'

/**
 * Order tracking: e-mail + order number look-up, then the customer's orders (a standalone
 * Table) and the selected order's timeline (a standalone Infolist).
 */
const props = defineProps<TrackPageProps>()

const page = usePage<StorefrontShared>()
const links = computed(() => storefrontLinks(page.props.renderer))
const email = ref(props.lookup.email)
const number = ref(props.lookup.number)

function submit(): void {
    router.get(
        links.value.track,
        { email: email.value.trim(), number: number.value.trim() },
        { preserveScroll: true },
    )
}

function useSample(): void {
    if (!props.sample) return
    email.value = props.sample.email
    number.value = props.sample.number
    router.get(
        links.value.track,
        { email: props.sample.email, number: props.sample.number },
        { preserveScroll: true },
    )
}
</script>

<template>
    <Layout>
        <Head :title="`${copy.heading} · ${page.props.storefront.brand}`" />

        <section class="mx-auto w-full max-w-6xl px-4 pt-12 pb-16 sm:px-6">
            <h1 class="text-3xl font-bold sm:text-4xl">{{ copy.heading }}</h1>
            <p class="text-brand-navy/75 mt-4 max-w-2xl text-base leading-relaxed">
                {{ copy.intro }}
            </p>

            <form
                class="border-brand-navy/10 mt-8 grid gap-4 rounded-3xl border bg-white p-6 shadow-xs sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                @submit.prevent="submit"
            >
                <label class="block text-sm font-medium">
                    {{ copy.fields.email }}
                    <input
                        v-model="email"
                        type="email"
                        name="email"
                        required
                        autocomplete="email"
                        class="border-brand-navy/20 focus:border-brand-navy focus:ring-brand-navy/20 mt-1.5 block h-10 w-full rounded-lg border bg-white px-3 text-sm font-normal outline-none focus:ring-2"
                    />
                </label>
                <label class="block text-sm font-medium">
                    {{ copy.fields.number }}
                    <input
                        v-model="number"
                        type="text"
                        name="number"
                        required
                        placeholder="MA-MAN-00260"
                        class="border-brand-navy/20 focus:border-brand-navy focus:ring-brand-navy/20 mt-1.5 block h-10 w-full rounded-lg border bg-white px-3 font-mono text-sm font-normal outline-none focus:ring-2"
                    />
                </label>
                <button
                    type="submit"
                    class="bg-brand-navy hover:bg-brand-navy/90 inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold text-white shadow-sm transition-colors"
                >
                    {{ copy.fields.submit }}
                </button>
            </form>

            <div
                v-if="lookup.state === 'not_found'"
                role="alert"
                class="border-brand-orange/40 bg-brand-orange/10 mt-6 rounded-2xl border p-5"
            >
                <h2 class="text-base font-semibold">{{ copy.not_found.heading }}</h2>
                <p class="text-brand-navy/75 mt-1 text-sm">{{ copy.not_found.body }}</p>
            </div>

            <div
                v-if="sample"
                class="border-brand-navy/15 mt-6 flex flex-col gap-3 rounded-2xl border border-dashed bg-white/60 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
                <div>
                    <h2 class="text-base font-semibold">{{ copy.sample.heading }}</h2>
                    <p class="text-brand-navy/70 mt-1 text-sm">
                        {{ copy.sample.body }}
                        <span class="font-mono text-xs"
                            >{{ sample.email }} · {{ sample.number }}</span
                        >
                    </p>
                </div>
                <button
                    type="button"
                    class="border-brand-navy/20 hover:border-brand-navy/60 inline-flex h-9 shrink-0 items-center justify-center rounded-full border bg-white px-4 text-sm font-semibold transition-colors"
                    @click="useSample"
                >
                    {{ copy.sample.use }}
                </button>
            </div>

            <div v-if="orders && timeline" class="mt-10 space-y-8">
                <div class="border-brand-navy/10 rounded-3xl border bg-white p-6 shadow-xs">
                    <AlfakitComponent :component="orders" />
                </div>
                <div class="border-brand-navy/10 rounded-3xl border bg-white p-6 shadow-xs">
                    <AlfakitComponent :component="timeline" />
                </div>
                <p class="text-brand-navy/55 text-xs">{{ copy.components_note }}</p>
            </div>
        </section>
    </Layout>
</template>
