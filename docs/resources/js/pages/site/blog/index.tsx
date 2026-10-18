import { SiteLayout } from '@/components/site/site-layout'
import { PageHero } from '@/components/site/ui'
import { formatDate, type PostSummary } from '@/lib/blog'
import { Link } from '@inertiajs/react'
import { ArrowRight, Rss } from 'lucide-react'

export default function BlogIndex({ posts }: { posts: PostSummary[] }) {
    return (
        <SiteLayout>
            <PageHero eyebrow="Blog" title="News from the AlfaKit team">
                <p>Release notes, guides and the thinking behind AlfaKit, from Alfa Six.</p>
                <p className="mt-4 text-base">
                    <a
                        href="/blog/rss.xml"
                        className="text-primary inline-flex items-center gap-1.5 font-semibold"
                    >
                        <Rss className="size-4" aria-hidden="true" /> Subscribe with RSS
                    </a>
                </p>
            </PageHero>

            <div className="mx-auto max-w-screen-xl px-4 py-14">
                {posts.length === 0 ? (
                    <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center">
                        No posts yet.
                    </p>
                ) : (
                    <ul className="grid gap-8 md:grid-cols-2">
                        {posts.map((post, index) => (
                            <li key={post.slug}>
                                <article className="group bg-card relative flex h-full flex-col overflow-hidden rounded-xl border">
                                    {post.cover && (
                                        <img
                                            src={post.cover}
                                            alt={post.coverAlt}
                                            width="1440"
                                            height="900"
                                            loading={index < 2 ? 'eager' : 'lazy'}
                                            decoding="async"
                                            className="aspect-[16/9] h-auto w-full border-b object-cover object-top"
                                        />
                                    )}
                                    <div className="flex flex-1 flex-col gap-3 p-6">
                                        <p className="text-muted-foreground text-sm">
                                            <time dateTime={post.date}>
                                                {formatDate(post.date)}
                                            </time>{' '}
                                            · {post.readingMinutes} min read · {post.author}
                                        </p>
                                        <h2 className="text-xl font-bold tracking-tight text-balance">
                                            <Link
                                                href={`/blog/${post.slug}`}
                                                className="after:absolute after:inset-0"
                                            >
                                                {post.title}
                                            </Link>
                                        </h2>
                                        <p className="text-muted-foreground text-sm">
                                            {post.description}
                                        </p>
                                        <span
                                            className="text-primary mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold"
                                            aria-hidden="true"
                                        >
                                            Read the post{' '}
                                            <ArrowRight className="size-4 rtl:rotate-180" />
                                        </span>
                                    </div>
                                </article>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </SiteLayout>
    )
}
