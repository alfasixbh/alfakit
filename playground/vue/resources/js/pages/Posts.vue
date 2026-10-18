<script setup lang="ts">
import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/vue';
import { Head } from '@inertiajs/vue3';
import Heading from '@/components/Heading.vue';
import { dashboard } from '@/routes';

/**
 * An Alfakit table outside the admin panel: `MyPostsTable::make(['author' => $user])`
 * arrives as the `posts` prop; sorting, search, filters and actions work as in the panel.
 */
defineProps<{ posts: StandaloneComponentSchema }>();

defineOptions({
    layout: {
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'My posts', href: '/posts' },
        ],
    },
});
</script>

<template>
    <Head title="My posts" />
    <div class="flex flex-col gap-6 p-6">
        <Heading title="My posts" description="An AlfaKit standalone table in the app layout." />
        <AlfakitComponent :component="posts" />
    </div>
</template>
