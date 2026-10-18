import { BuiltWith } from '@/components/site/built-with'
import { SiteLayout } from '@/components/site/site-layout'
import { PageHero } from '@/components/site/ui'
import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/react'
import { Bug, Building2, MessagesSquare } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
    /** The contact form of the Forms plugin, when the site runs it (config docs.dogfood). */
    form: StandaloneComponentSchema | null
    links: { discussions: string; issues: string; alfaSix: string }
}

export default function Contact({ form, links }: Props) {
    const channels: Array<{
        icon: ReactNode
        title: string
        text: string
        href: string
        action: string
    }> = [
        {
            icon: <MessagesSquare className="size-5" />,
            title: 'Questions and ideas',
            text: 'Ask how to build something or suggest a feature in GitHub Discussions.',
            href: links.discussions,
            action: 'Open Discussions',
        },
        {
            icon: <Bug className="size-5" />,
            title: 'Bugs',
            text: 'Found a bug? Open an issue with the steps to reproduce it.',
            href: links.issues,
            action: 'Open an issue',
        },
        {
            icon: <Building2 className="size-5" />,
            title: 'Projects',
            text: 'Alfa Six builds and supports AlfaKit apps for teams.',
            href: links.alfaSix,
            action: 'Visit alfasixbh.com',
        },
    ]

    return (
        <SiteLayout>
            <PageHero eyebrow="Contact" title="Talk to the AlfaKit team">
                <p>
                    A question about AlfaKit, an idea for a plugin or a project for Alfa Six: write
                    to us, or pick the channel that fits.
                </p>
            </PageHero>

            <div className="mx-auto grid max-w-screen-xl gap-10 px-4 py-14 lg:grid-cols-[1.4fr_1fr]">
                <section aria-labelledby="contact-form" className="min-w-0">
                    <h2 id="contact-form" className="text-2xl font-bold tracking-tight">
                        Send us a message
                    </h2>
                    {form ? (
                        <div className="bg-card mt-6 rounded-xl border p-6">
                            <AlfakitComponent component={form} />
                            <BuiltWith plugin="Forms" slug="forms" className="mt-6 border-t pt-4" />
                        </div>
                    ) : (
                        <p className="text-muted-foreground mt-4">
                            The contact form is not available here. Reach us through one of the
                            channels on this page.
                        </p>
                    )}
                </section>

                <ul className="flex flex-col gap-4" aria-label="Other channels">
                    {channels.map((channel) => (
                        <li
                            key={channel.title}
                            className="bg-card flex gap-4 rounded-xl border p-5"
                        >
                            <span
                                className="bg-secondary text-secondary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg"
                                aria-hidden="true"
                            >
                                {channel.icon}
                            </span>
                            <div className="min-w-0">
                                <h3 className="font-semibold">{channel.title}</h3>
                                <p className="text-muted-foreground mt-1 text-sm">{channel.text}</p>
                                <a
                                    href={channel.href}
                                    className="text-primary mt-2 inline-block text-sm font-semibold"
                                >
                                    {channel.action}
                                </a>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </SiteLayout>
    )
}
