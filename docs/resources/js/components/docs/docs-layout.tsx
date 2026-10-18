import { Dogfood } from '@/components/site/dogfood'
import { Seo } from '@/components/site/seo'
import { SiteFooter } from '@/components/site/site-footer'
import { Logo, MobileNavLinks, SiteHeader } from '@/components/site/site-header'
import { Button } from '@alfakit/react'
import { Link } from '@inertiajs/react'
import { X } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export interface SidebarSection {
    label: string
    items: Array<{ slug: string; title: string }>
}

/** Kept for older imports: the docs use the site header and logo. */
export { Logo, SiteHeader as TopNav }

export function DocsLayout({
    sidebar,
    current,
    children,
}: {
    sidebar: SidebarSection[]
    current: string
    children: ReactNode
}) {
    const [menuOpen, setMenuOpen] = useState(false)
    const aside = useRef<HTMLElement>(null)

    // The layout persists across visits (see pages/docs/show.tsx), so the sidebar keeps its
    // scroll position; on a deep link or a jump to another section, bring the active item
    // into view.
    useLayoutEffect(() => {
        aside.current
            ?.querySelector<HTMLElement>('[data-active="true"]')
            ?.scrollIntoView({ block: 'nearest' })
    }, [current])

    // Close the mobile menu when navigating to another page.
    const [menuPage, setMenuPage] = useState(current)
    if (menuPage !== current) {
        setMenuPage(current)
        setMenuOpen(false)
    }

    const nav = (
        <div className="flex flex-col gap-6 text-sm">
            {sidebar.map((section) => (
                <div key={section.label}>
                    <p className="text-foreground mb-2 font-semibold">{section.label}</p>
                    <ul className="flex flex-col gap-0.5">
                        {section.items.map((item) => (
                            <li key={item.slug}>
                                <Link
                                    href={`/docs/${item.slug}`}
                                    data-active={item.slug === current ? 'true' : undefined}
                                    aria-current={item.slug === current ? 'page' : undefined}
                                    className={`block rounded-md border-s-2 px-2 py-1 ${item.slug === current ? 'border-primary bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border-transparent'}`}
                                >
                                    {item.title}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    )

    return (
        <div className="min-h-svh">
            <Seo />
            <Dogfood />
            <SiteHeader onMenu={() => setMenuOpen(true)} />
            <div className="mx-auto flex max-w-screen-2xl gap-10 px-4">
                <aside
                    ref={aside}
                    className="sticky top-16 hidden h-[calc(100svh-4rem)] w-60 shrink-0 overflow-y-auto border-e py-8 pe-4 lg:block"
                >
                    <nav aria-label="Documentation">{nav}</nav>
                </aside>
                {menuOpen && (
                    <div
                        className="fixed inset-0 z-40 lg:hidden"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menu"
                    >
                        <div
                            className="absolute inset-0 bg-black/40"
                            onClick={() => setMenuOpen(false)}
                        />
                        <div className="bg-background absolute inset-y-0 start-0 w-72 overflow-y-auto p-6 shadow-xl">
                            <div className="mb-6 flex items-center justify-between">
                                <Logo />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setMenuOpen(false)}
                                    aria-label="Close"
                                >
                                    <X />
                                </Button>
                            </div>
                            <nav aria-label="Main" className="mb-6 border-b pb-6">
                                <MobileNavLinks onNavigate={() => setMenuOpen(false)} />
                            </nav>
                            <nav aria-label="Documentation">{nav}</nav>
                        </div>
                    </div>
                )}
                <main id="main" className="min-w-0 flex-1 py-8">
                    {children}
                </main>
            </div>
            <SiteFooter />
        </div>
    )
}
