import { highlightCodeBlocks } from '@/components/docs/highlight'
import { SiteLayout } from '@/components/site/site-layout'
import { formatDate, type Post, type PostSummary } from '@/lib/blog'
import { Link } from '@inertiajs/react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useRef } from 'react'

export default function BlogShow({ post, more }: { post: Post; more: PostSummary[] }) {
    const body = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (body.current) highlightCodeBlocks(body.current)
    }, [post.slug])

    return (
        <SiteLayout>
            <article>
                <header className="bg-brand-cream dark:bg-card border-b">
                    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
                        <Link
                            href="/blog"
                            className="text-primary inline-flex items-center gap-1.5 text-sm font-semibold"
                        >
                            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" /> All
                            posts
                        </Link>
                        <h1 className="mt-6 text-3xl font-bold tracking-tight text-balance sm:text-5xl">
                            {post.title}
                        </h1>
                        <p className="text-muted-foreground mt-4 text-lg text-pretty">
                            {post.description}
                        </p>
                        <p className="text-muted-foreground mt-6 text-sm">
                            <time dateTime={post.date}>{formatDate(post.date)}</time> ·{' '}
                            {post.readingMinutes} min read · {post.author}
                        </p>
                    </div>
                </header>
                {post.cover && (
                    <div className="mx-auto max-w-4xl px-4 pt-10">
                        <img
                            src={post.cover}
                            alt={post.coverAlt}
                            width="1440"
                            height="900"
                            fetchPriority="high"
                            className="h-auto w-full rounded-xl border shadow-sm"
                        />
                    </div>
                )}
                <div
                    ref={body}
                    className="docs-prose mx-auto max-w-3xl px-4 py-10"
                    dangerouslySetInnerHTML={{ __html: post.html }}
                />
            </article>
            {more.length > 0 && (
                <aside aria-labelledby="more-posts" className="border-t">
                    <div className="mx-auto max-w-3xl px-4 py-12">
                        <h2 id="more-posts" className="text-xl font-bold">
                            More from the blog
                        </h2>
                        <ul className="mt-4 flex flex-col divide-y">
                            {more.slice(0, 3).map((other) => (
                                <li key={other.slug} className="py-4">
                                    <Link
                                        href={`/blog/${other.slug}`}
                                        className="group flex items-start justify-between gap-4"
                                    >
                                        <span>
                                            <span className="group-hover:text-primary block font-semibold">
                                                {other.title}
                                            </span>
                                            <span className="text-muted-foreground text-sm">
                                                {formatDate(other.date)}
                                            </span>
                                        </span>
                                        <ArrowRight
                                            className="text-muted-foreground mt-1 size-4 shrink-0 rtl:rotate-180"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>
            )}
        </SiteLayout>
    )
}
