import { Link, usePage } from '@inertiajs/react'
import { AlfaSixLockup } from './alfa-six'
import type { DogfoodProps } from './dogfood'
import { ALFA_SIX_URL, GITHUB_URL, GitHubIcon, LICENSE_URL } from './site-header'

type FooterLink = { label: string; href: string; external?: boolean }

export function SiteFooter() {
    const { demoUrl } = usePage().props
    const dogfood = usePage().props.dogfood as DogfoodProps | undefined
    const builtWith = [
        dogfood?.contact && { label: 'contact form', plugin: 'Forms', slug: 'forms' },
        dogfood?.analytics && { label: 'site stats', plugin: 'Analytics', slug: 'analytics' },
        dogfood?.chat && { label: 'chat', plugin: 'Helpdesk', slug: 'helpdesk' },
    ].filter((item): item is { label: string; plugin: string; slug: string } => Boolean(item))

    const columns: Array<{ title: string; links: FooterLink[] }> = [
        {
            title: 'Product',
            links: [
                { label: 'Features', href: '/features' },
                { label: 'Live demo', href: demoUrl, external: true },
                { label: 'About the demo', href: '/demo' },
                { label: 'Plugins', href: '/plugins' },
                { label: 'Changelog', href: '/changelog' },
            ],
        },
        {
            title: 'Documentation',
            links: [
                { label: 'Installation', href: '/docs/getting-started/installation' },
                { label: 'Quick start', href: '/docs/getting-started/quick-start' },
                {
                    label: 'Coming from Filament',
                    href: '/docs/getting-started/filament-comparison',
                },
                { label: 'Performance', href: '/docs/getting-started/performance' },
                { label: 'Contributing a plugin', href: '/docs/panels/contributing-a-plugin' },
            ],
        },
        {
            title: 'Resources',
            links: [
                { label: 'Blog', href: '/blog' },
                { label: 'RSS feed', href: '/blog/rss.xml', external: true },
                { label: 'AI agents', href: '/ai' },
                { label: 'llms.txt', href: '/llms.txt', external: true },
                { label: 'Sitemap', href: '/sitemap.xml', external: true },
            ],
        },
        {
            title: 'Community',
            links: [
                { label: 'GitHub', href: GITHUB_URL, external: true },
                { label: 'Discussions', href: `${GITHUB_URL}/discussions`, external: true },
                { label: 'Issues', href: `${GITHUB_URL}/issues`, external: true },
                {
                    label: 'Contributing',
                    href: `${GITHUB_URL}/blob/main/CONTRIBUTING.md`,
                    external: true,
                },
                { label: 'Security', href: '/community#security' },
            ],
        },
        {
            title: 'Alfa Six',
            links: [
                { label: 'alfasixbh.com', href: ALFA_SIX_URL, external: true },
                { label: 'Services', href: '/services' },
                { label: 'Contact', href: '/contact' },
                { label: 'Community', href: '/community' },
            ],
        },
    ]

    return (
        <footer className="bg-background border-t">
            <div className="mx-auto grid max-w-screen-xl gap-10 px-4 py-14 lg:grid-cols-[1.3fr_3fr]">
                <div className="flex flex-col items-start gap-4">
                    <Link href="/" aria-label="AlfaKit home" className="rounded-md">
                        <img
                            src="/brand/alfakit-horizontal-color.svg"
                            alt=""
                            width="118"
                            height="44"
                            className="h-11 w-auto dark:hidden"
                        />
                        <img
                            src="/brand/alfakit-horizontal-reverse.svg"
                            alt=""
                            width="118"
                            height="44"
                            className="hidden h-11 w-auto dark:block"
                        />
                    </Link>
                    <p className="text-muted-foreground max-w-xs text-sm">
                        Your Laravel foundation. Your frontend choice. An admin panel builder for
                        React, Vue and Svelte.
                    </p>
                    <div className="flex flex-col gap-1.5">
                        <p className="text-muted-foreground text-sm">AlfaKit is made by</p>
                        <AlfaSixLockup className="-ms-1" />
                    </div>
                    <a
                        href={GITHUB_URL}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
                    >
                        <GitHubIcon /> alfasixbh/alfakit
                    </a>
                </div>
                <nav
                    aria-label="Footer"
                    className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5"
                >
                    {columns.map((column) => (
                        <div key={column.title}>
                            <h2 className="text-muted-foreground! mb-3 font-mono text-xs font-medium tracking-wider uppercase">
                                {column.title}
                            </h2>
                            <ul className="flex flex-col gap-2 text-sm">
                                {column.links.map((link) => (
                                    <li key={link.label}>
                                        {link.external ? (
                                            <a
                                                href={link.href}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                {link.label}
                                            </a>
                                        ) : (
                                            <Link
                                                href={link.href}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                {link.label}
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>
            </div>
            <div className="border-t">
                <div className="text-muted-foreground mx-auto flex max-w-screen-xl flex-col gap-2 px-4 py-6 text-xs">
                    {(builtWith.length > 0 || dogfood?.analytics?.shareUrl) && (
                        <p>
                            {builtWith.length > 0 && (
                                <>
                                    This site runs on AlfaKit:{' '}
                                    {builtWith.map((item, index) => (
                                        <span key={item.slug}>
                                            {index > 0 && ', '}
                                            {item.label} built with{' '}
                                            <Link
                                                href={`/plugins/${item.slug}`}
                                                className="text-foreground underline-offset-4 hover:underline"
                                            >
                                                AlfaKit {item.plugin}
                                            </Link>
                                        </span>
                                    ))}
                                    .{' '}
                                </>
                            )}
                            {dogfood?.analytics?.shareUrl && (
                                <a
                                    href={dogfood.analytics.shareUrl}
                                    className="text-foreground underline-offset-4 hover:underline"
                                >
                                    Public site stats
                                </a>
                            )}
                        </p>
                    )}
                    <p>
                        Released under the{' '}
                        <a
                            href={LICENSE_URL}
                            className="text-foreground underline-offset-4 hover:underline"
                        >
                            MIT License
                        </a>
                        ; the AlfaKit name, mascot and logos are brand assets of Alfa Six. Developed
                        by{' '}
                        <a
                            href={ALFA_SIX_URL}
                            className="text-foreground underline-offset-4 hover:underline"
                        >
                            Alfa Six
                        </a>
                        .
                    </p>
                    <p>
                        Filament is a trademark of its respective owners. AlfaKit is an independent
                        project, not affiliated with or endorsed by the Filament project, and
                        grateful for it.
                    </p>
                </div>
            </div>
        </footer>
    )
}
