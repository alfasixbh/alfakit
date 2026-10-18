import { DocsLayout, type SidebarSection } from '@/components/docs/docs-layout'
import { highlightCodeBlocks } from '@/components/docs/highlight'
import { LiveExample, type LiveExampleData } from '@/components/docs/live-example'
import { FirstPartyLabel } from '@/components/site/alfa-six'
import { copyText } from '@/lib/copy'
import { Button, Input } from '@alfakit/react'
import { Link, useForm, usePage } from '@inertiajs/react'
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Copy,
    ExternalLink,
    FileText,
    ThumbsDown,
    ThumbsUp,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface DocPage {
    slug: string
    title: string
    description: string | null
    html: string
    toc: Array<{ id: string; text: string; level: number }>
    previous: { slug: string; title: string } | null
    next: { slug: string; title: string } | null
    editUrl: string
}

export default function Show({
    page,
    firstParty = false,
    examples = {},
}: {
    sidebar: SidebarSection[]
    page: DocPage
    firstParty?: boolean
    /** Live examples of the page, mounted into their placeholders in the HTML. */
    examples?: Record<string, LiveExampleData>
}) {
    const article = useRef<HTMLElement>(null)
    const content = useRef<HTMLDivElement>(null)
    const [active, setActive] = useState<string | null>(null)
    const [mounts, setMounts] = useState<Array<{ element: HTMLElement; name: string }>>([])

    useEffect(() => {
        const placeholders =
            content.current?.querySelectorAll<HTMLElement>('[data-alfakit-example]')

        setMounts(
            Array.from(placeholders ?? []).map((element) => ({
                element,
                name: element.dataset.alfakitExample ?? '',
            })),
        )
    }, [page.slug, page.html])

    useEffect(() => {
        if (!article.current) return
        highlightCodeBlocks(article.current)

        const headings = Array.from(article.current.querySelectorAll<HTMLElement>('h2[id], h3[id]'))
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
                if (visible[0]) setActive(visible[0].target.id)
            },
            { rootMargin: '-80px 0px -70% 0px' },
        )
        headings.forEach((heading) => observer.observe(heading))

        return () => observer.disconnect()
    }, [page.slug])

    return (
        <>
            <div className="flex gap-12">
                <article ref={article} className="docs-prose min-w-0 flex-1">
                    <MarkdownActions slug={page.slug} />
                    {firstParty && <FirstPartyLabel className="not-prose mb-4" />}
                    {page.description && (
                        <p className="text-muted-foreground -mt-2 mb-6 text-base">
                            {page.description}
                        </p>
                    )}
                    <div ref={content} dangerouslySetInnerHTML={{ __html: page.html }} />
                    {mounts.map(({ element, name }) =>
                        examples[name]
                            ? createPortal(
                                  <LiveExample key={name} example={examples[name]} />,
                                  element,
                                  `${page.slug}:${name}`,
                              )
                            : null,
                    )}
                    <Feedback key={page.slug} slug={page.slug} />
                    <nav className="mt-10 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-between">
                        {page.previous ? (
                            <Link
                                href={`/docs/${page.previous.slug}`}
                                className="hover:text-foreground text-muted-foreground inline-flex items-center gap-2 text-sm"
                            >
                                <ArrowLeft className="size-4" /> {page.previous.title}
                            </Link>
                        ) : (
                            <span />
                        )}
                        {page.next && (
                            <Link
                                href={`/docs/${page.next.slug}`}
                                className="hover:text-foreground text-muted-foreground inline-flex items-center gap-2 text-sm sm:ms-auto"
                            >
                                {page.next.title} <ArrowRight className="size-4" />
                            </Link>
                        )}
                    </nav>
                </article>
                {page.toc.length > 1 && (
                    <aside className="sticky top-20 hidden h-fit w-56 shrink-0 self-start xl:block">
                        <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
                            On this page
                        </p>
                        <ul className="flex flex-col gap-1.5 border-s text-sm">
                            {page.toc.map((item) => (
                                <li
                                    key={item.id}
                                    style={{
                                        paddingInlineStart: item.level === 3 ? '1.5rem' : '0.75rem',
                                    }}
                                    className={`-ms-px border-s ${active === item.id ? 'border-primary text-foreground' : 'text-muted-foreground hover:text-foreground border-transparent'}`}
                                >
                                    <a href={`#${item.id}`} className="block truncate py-0.5">
                                        {item.text}
                                    </a>
                                </li>
                            ))}
                        </ul>
                        <a
                            href={page.editUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground mt-6 inline-flex items-center gap-1.5 text-xs"
                        >
                            Edit this page <ExternalLink className="size-3" />
                        </a>
                        <a
                            href={`/docs/${page.slug}.md`}
                            className="text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1.5 text-xs"
                            title="This page as Markdown, for AI agents"
                        >
                            View as Markdown
                        </a>
                    </aside>
                )}
            </div>
        </>
    )
}

function Feedback({ slug }: { slug: string }) {
    const { props } = usePage<{ flash?: { feedback?: string } }>()
    const form = useForm({ page: slug, is_helpful: true, message: '', email: '' })
    const [open, setOpen] = useState(false)

    if (props.flash?.feedback) {
        return (
            <p className="bg-muted/50 mt-10 rounded-lg border p-4 text-sm">
                {props.flash.feedback}
            </p>
        )
    }

    return (
        <div className="bg-muted/30 mt-10 rounded-lg border p-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium">Was this page helpful?</span>
                <Button
                    type="button"
                    size="sm"
                    variant={open && form.data.is_helpful ? 'default' : 'outline'}
                    onClick={() => {
                        form.setData('is_helpful', true)
                        setOpen(true)
                    }}
                >
                    <ThumbsUp /> Yes
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant={open && !form.data.is_helpful ? 'default' : 'outline'}
                    onClick={() => {
                        form.setData('is_helpful', false)
                        setOpen(true)
                    }}
                >
                    <ThumbsDown /> No
                </Button>
            </div>
            {open && (
                <form
                    className="mt-4 flex flex-col gap-3"
                    onSubmit={(event) => {
                        event.preventDefault()
                        form.post('/docs/feedback', { preserveScroll: true })
                    }}
                >
                    <textarea
                        value={form.data.message}
                        onChange={(event) => form.setData('message', event.target.value)}
                        placeholder="Tell us more (optional)"
                        className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                        <Input
                            type="email"
                            value={form.data.email}
                            onChange={(event) => form.setData('email', event.target.value)}
                            placeholder="Email (optional)"
                            className="max-w-xs"
                        />
                        <Button type="submit" size="sm" disabled={form.processing}>
                            Send
                        </Button>
                        {form.errors.email && (
                            <span className="text-destructive text-xs">{form.errors.email}</span>
                        )}
                    </div>
                </form>
            )}
        </div>
    )
}

/** For AI agents and chat assistants: the page as raw Markdown, copied or opened. */
function MarkdownActions({ slug }: { slug: string }) {
    const [copied, setCopied] = useState(false)
    const url = `/docs/${slug}.md`

    const copy = async () => {
        try {
            const response = await fetch(url)
            if (await copyText(await response.text())) {
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1500)
                return
            }
        } catch {
            // fall through
        }
        window.open(url, '_blank', 'noopener')
    }

    return (
        <div className="not-prose float-end ms-4 mb-2 flex items-center gap-1">
            <Button type="button" variant="outline" size="sm" onClick={copy}>
                {copied ? <Check /> : <Copy />}
                {copied ? 'Copied' : 'Copy as Markdown'}
            </Button>
            <Button asChild variant="ghost" size="sm">
                <a href={url} title="View this page as Markdown, for AI agents">
                    <FileText />
                    <span className="sr-only sm:not-sr-only">Markdown</span>
                </a>
            </Button>
        </div>
    )
}

// A persistent layout component: Inertia keeps it mounted between docs pages (it receives
// the page props), so the sidebar's scroll position survives navigation.
function DocsPageLayout({
    children,
    sidebar,
    page,
}: {
    children: ReactNode
    sidebar: SidebarSection[]
    page: DocPage
}) {
    return (
        <DocsLayout sidebar={sidebar} current={page.slug}>
            {children}
        </DocsLayout>
    )
}

Show.layout = DocsPageLayout
