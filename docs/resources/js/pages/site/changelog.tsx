import { highlightCodeBlocks } from '@/components/docs/highlight'
import { SiteLayout } from '@/components/site/site-layout'
import { PageHero } from '@/components/site/ui'
import { ExternalLink } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface Props {
    html: string | null
    toc: Array<{ id: string; text: string; level: number }>
    sourceUrl: string
}

export default function Changelog({ html, toc, sourceUrl }: Props) {
    const body = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (body.current) highlightCodeBlocks(body.current)
    }, [html])

    return (
        <SiteLayout>
            <PageHero eyebrow="Changelog" title="What changed in AlfaKit">
                <p>
                    Every notable change to{' '}
                    <code className="font-mono text-base">alfasix/alfakit</code>, rendered from the
                    repository's CHANGELOG.md. The npm packages keep their own changelogs.
                </p>
                <p className="mt-4 text-base">
                    <a
                        href={sourceUrl}
                        className="text-primary inline-flex items-center gap-1.5 font-semibold"
                    >
                        CHANGELOG.md on GitHub{' '}
                        <ExternalLink className="size-4" aria-hidden="true" />
                    </a>
                </p>
            </PageHero>
            <div className="mx-auto flex max-w-screen-xl gap-12 px-4 py-12">
                {toc.length > 1 && (
                    <nav aria-label="Changelog sections" className="hidden w-60 shrink-0 lg:block">
                        <ul className="sticky top-24 flex max-h-[calc(100svh-7rem)] flex-col gap-1.5 overflow-y-auto border-s text-sm">
                            {toc.map((item) => (
                                <li
                                    key={item.id}
                                    style={{
                                        paddingInlineStart: item.level === 3 ? '1.5rem' : '0.75rem',
                                    }}
                                >
                                    <a
                                        href={`#${item.id}`}
                                        className={
                                            item.level === 2
                                                ? 'text-foreground block py-0.5 font-semibold'
                                                : 'text-muted-foreground hover:text-foreground block truncate py-0.5'
                                        }
                                    >
                                        {item.text}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                )}
                {html ? (
                    <div
                        ref={body}
                        className="docs-prose min-w-0 flex-1 [overflow-wrap:anywhere]"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                ) : (
                    <p className="text-muted-foreground">
                        The changelog is not available on this server. Read it on{' '}
                        <a href={sourceUrl}>GitHub</a>.
                    </p>
                )}
            </div>
        </SiteLayout>
    )
}
