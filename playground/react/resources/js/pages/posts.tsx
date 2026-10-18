import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/react';
import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import { dashboard } from '@/routes';

/**
 * An Alfakit table outside the admin panel: `MyPostsTable::make(['author' => $user])`
 * arrives as the `posts` prop; sorting, search, filters and actions work as in the panel.
 */
export default function Posts({ posts }: { posts: StandaloneComponentSchema }) {
    return (
        <>
            <Head title="My posts" />
            <div className="flex flex-col gap-6 p-6">
                <Heading
                    title="My posts"
                    description="An AlfaKit standalone table in the app layout."
                />
                <AlfakitComponent component={posts} />
            </div>
        </>
    );
}

Posts.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'My posts', href: '/posts' },
    ],
};
