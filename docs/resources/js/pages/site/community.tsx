import { GitHubIcon } from '@/components/site/site-header'
import { SiteLayout } from '@/components/site/site-layout'
import { PageHero } from '@/components/site/ui'
import { Button } from '@alfakit/react'
import { Link } from '@inertiajs/react'
import {
    Bot,
    Bug,
    GitPullRequest,
    Languages,
    MessagesSquare,
    Scale,
    ShieldAlert,
} from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
    security: string | null
    links: Record<
        | 'github'
        | 'discussions'
        | 'issues'
        | 'contributing'
        | 'conduct'
        | 'security'
        | 'translations',
        string
    >
}

export default function Community({ security, links }: Props) {
    const cards: Array<{
        icon: ReactNode
        title: string
        text: string
        href: string
        action: string
        internal?: boolean
    }> = [
        {
            icon: <MessagesSquare className="size-5" />,
            title: 'Ask a question',
            text: 'Questions, ideas and show-and-tell go to GitHub Discussions, where answers stay searchable for the next person.',
            href: links.discussions,
            action: 'Open Discussions',
        },
        {
            icon: <Bug className="size-5" />,
            title: 'Report a bug',
            text: 'Open an issue with the AlfaKit, Laravel and PHP versions, the renderer, and the smallest code that shows the problem.',
            href: links.issues,
            action: 'Open an issue',
        },
        {
            icon: <GitPullRequest className="size-5" />,
            title: 'Contribute code',
            text: 'The contributing guide explains the monorepo, the playgrounds, the test commands and what a pull request needs.',
            href: links.contributing,
            action: 'Read the contributing guide',
        },
        {
            icon: <Languages className="size-5" />,
            title: 'Translate',
            text: 'The translations package holds every language pack. Add a language or fix a string; a test checks that every key exists.',
            href: links.translations,
            action: 'Open the translations',
        },
        {
            icon: <Scale className="size-5" />,
            title: 'Code of conduct',
            text: 'Everyone taking part in the project, in issues, discussions and pull requests, follows the code of conduct.',
            href: links.conduct,
            action: 'Read the code of conduct',
        },
        {
            icon: <Bot className="size-5" />,
            title: 'Docs for AI agents',
            text: 'The documentation is available as llms.txt, as one file and as Markdown per page, for your coding agent.',
            href: '/ai',
            action: 'AlfaKit for AI agents',
            internal: true,
        },
    ]

    return (
        <SiteLayout>
            <PageHero eyebrow="Community" title="Build AlfaKit with us">
                <p>
                    AlfaKit is open source under the MIT licence. The code, the issues and the
                    discussions all live on GitHub.
                </p>
                <div className="mt-6">
                    <Button asChild>
                        <a href={links.github}>
                            <GitHubIcon /> alfasix/alfakit on GitHub
                        </a>
                    </Button>
                </div>
            </PageHero>

            <div className="mx-auto max-w-screen-xl px-4 py-14">
                <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {cards.map((card) => (
                        <li
                            key={card.title}
                            className="bg-card flex flex-col gap-3 rounded-xl border p-6"
                        >
                            <span
                                className="bg-secondary text-secondary-foreground flex size-9 items-center justify-center rounded-lg"
                                aria-hidden="true"
                            >
                                {card.icon}
                            </span>
                            <h2 className="text-lg font-bold">{card.title}</h2>
                            <p className="text-muted-foreground text-sm">{card.text}</p>
                            <p className="mt-auto pt-2 text-sm font-semibold">
                                {card.internal ? (
                                    <Link href={card.href} className="text-primary">
                                        {card.action}
                                    </Link>
                                ) : (
                                    <a href={card.href} className="text-primary">
                                        {card.action}
                                    </a>
                                )}
                            </p>
                        </li>
                    ))}
                </ul>

                <section
                    id="security"
                    aria-labelledby="security-title"
                    className="mt-16 scroll-mt-24 rounded-xl border p-6 sm:p-8"
                >
                    <h2
                        id="security-title"
                        className="flex items-center gap-2 text-2xl font-bold tracking-tight"
                    >
                        <ShieldAlert className="text-primary size-6" aria-hidden="true" /> Security
                        policy
                    </h2>
                    {security ? (
                        <div
                            className="docs-prose mt-2 max-w-3xl [&_h2]:mt-6 [&_h2]:border-0 [&_h2]:text-lg"
                            dangerouslySetInnerHTML={{ __html: security }}
                        />
                    ) : (
                        <p className="text-muted-foreground mt-4">
                            Read the <a href={links.security}>security policy</a> on GitHub.
                        </p>
                    )}
                </section>
            </div>
        </SiteLayout>
    )
}
