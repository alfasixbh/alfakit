<script lang="ts">
    import { supportLinks, type SupportPageProps } from '@/shared/plugins'
    import type { StorefrontShared } from '@/shared/storefront'
    import { AlfakitComponent } from '@alfakit/svelte'
    import { inertia, usePage } from '@inertiajs/svelte'
    import Layout from './Layout.svelte'

    /**
     * The helpdesk's customer pages (alfasix/alfakit-helpdesk) at /support, in the shop's
     * layout of the visitor's last storefront.
     */
    let { components, meta }: SupportPageProps = $props()
    const page = usePage<StorefrontShared>()
    const plugins = $derived((page.props as unknown as StorefrontShared).plugins)
    const links = $derived(supportLinks(meta))
</script>

<svelte:head>
    <title>{meta.title}</title>
    <meta name="robots" content="noindex" />
</svelte:head>

<Layout>
    <section class="mx-auto w-full max-w-3xl px-4 pt-12 pb-16 sm:px-6">
        <h1 class="text-3xl font-bold sm:text-4xl">{plugins?.copy.support_title ?? meta.title}</h1>
        {#if plugins}
            <p class="text-brand-navy/75 mt-4 text-base leading-relaxed">
                {plugins.copy.support_intro}
            </p>
        {/if}
        {#if links.length > 0}
            <nav aria-label={meta.labels.navigation} class="mt-6 flex flex-wrap gap-2 text-sm">
                {#each links as link (link.href)}
                    <a
                        href={link.href}
                        use:inertia
                        aria-current={link.current ? 'page' : undefined}
                        class="border-brand-navy/15 aria-[current=page]:bg-brand-navy rounded-full border px-3 py-1.5 aria-[current=page]:text-white"
                        >{link.label}</a
                    >
                {/each}
            </nav>
        {/if}
        <div class="mt-8 flex flex-col gap-6">
            {#each components as component, index (`${meta.view}-${index}`)}
                <AlfakitComponent
                    {component}
                    class="border-brand-navy/10 rounded-3xl border bg-white p-6 shadow-xs sm:p-8"
                />
            {/each}
        </div>
    </section>
</Layout>
