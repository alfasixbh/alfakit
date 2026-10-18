<script module lang="ts">
    import { dashboard } from '@/routes';

    export const layout = {
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'My posts', href: '/posts' },
        ],
    };
</script>

<script lang="ts">
    import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/svelte';
    import AppHead from '@/components/AppHead.svelte';
    import Heading from '@/components/Heading.svelte';

    /**
     * An Alfakit table outside the admin panel: `MyPostsTable::make(['author' => $user])`
     * arrives as the `posts` prop; sorting, search, filters and actions work as in the panel.
     */
    let { posts }: { posts: StandaloneComponentSchema } = $props();
</script>

<AppHead title="My posts" />

<div class="flex flex-col gap-6 p-6">
    <Heading title="My posts" description="An AlfaKit standalone table in the app layout." />
    <AlfakitComponent component={posts} />
</div>
