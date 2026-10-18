<script lang="ts">
    import type { FormPageProps } from '@/shared/plugins'
    import { AlfakitComponent } from '@alfakit/svelte'
    import Layout from './Layout.svelte'

    /** A published form of alfasix/alfakit-forms at /forms/{slug}, in the shop's layout. */
    let { form, meta }: FormPageProps = $props()
</script>

<svelte:head>
    <title>{meta.title}</title>
    {#if meta.description}<meta name="description" content={meta.description} />{/if}
    {#if meta.preview}<meta name="robots" content="noindex" />{/if}
</svelte:head>

<Layout>
    <section class="mx-auto w-full max-w-3xl px-4 pt-12 pb-16 sm:px-6">
        <AlfakitComponent
            component={form}
            class="border-brand-navy/10 rounded-3xl border bg-white p-6 shadow-xs sm:p-8"
        />
    </section>
</Layout>
