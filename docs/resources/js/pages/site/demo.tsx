import { Screenshot } from '@/components/site/screenshot'
import { SiteLayout } from '@/components/site/site-layout'
import { CopyCommand, PageHero, SectionHeading } from '@/components/site/ui'
import { Button } from '@alfakit/react'
import { Link, usePage } from '@inertiajs/react'
import { ArrowRight, Clock, KeyRound, ShoppingBag } from 'lucide-react'

interface Props {
    links: Array<{ renderer: string; admin: string; storefront: string }>
    login: { email: string; password: string }
}

const TOUR = [
    {
        name: 'products-cards',
        title: 'Catalog',
        text: 'Products as a table or a card grid, with tabs, filters, a query builder, grouping and imports.',
    },
    {
        name: 'product-edit',
        title: 'Product editor',
        text: 'Tabs, translatable fields, live slugs and SKUs, field actions and relation managers.',
    },
    {
        name: 'order-wizard',
        title: 'Order wizard',
        text: 'Customer, items, addresses and review steps; each step validates on Next and line totals update as you pick products.',
    },
    {
        name: 'order-view',
        title: 'Order view',
        text: 'Tabs for items, payments and shipments, and a status timeline.',
    },
    {
        name: 'reports',
        title: 'Reports',
        text: 'Sales, customer and inventory reports built from widgets and shared filters.',
    },
    {
        name: 'rtl',
        title: 'Arabic, right to left',
        text: 'Switch the language in the user menu; the whole panel mirrors.',
    },
]

export default function Demo({ links, login }: Props) {
    const { demoUrl } = usePage().props

    return (
        <SiteLayout>
            <PageHero
                eyebrow="Live demo"
                title="Maison Alfa, a shop admin in three frameworks"
                aside={
                    <div className="bg-background flex flex-col gap-4 rounded-xl border p-6 shadow-sm">
                        <p className="flex items-center gap-2 font-semibold">
                            <KeyRound className="text-primary size-5" aria-hidden="true" /> Shared
                            login
                        </p>
                        <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-sm">
                            <dt className="text-muted-foreground">Email</dt>
                            <dd className="min-w-0">
                                <CopyCommand
                                    value={login.email}
                                    label="email address"
                                    className="[&>span:first-child]:hidden"
                                />
                            </dd>
                            <dt className="text-muted-foreground">Password</dt>
                            <dd className="min-w-0">
                                <CopyCommand
                                    value={login.password}
                                    label="password"
                                    className="[&>span:first-child]:hidden"
                                />
                            </dd>
                        </dl>
                        <p className="text-muted-foreground flex items-start gap-2 text-sm">
                            <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            Everyone shares this account. The data resets every hour, and the e-mail
                            address and password can't be changed.
                        </p>
                        <Button asChild>
                            <a href={`${demoUrl}/react/admin`}>Open the demo</a>
                        </Button>
                    </div>
                }
            >
                <p>
                    The demo is a perfume shop admin built with AlfaKit. One Laravel app serves
                    three panels with the same PHP configuration, rendered by React, Vue and Svelte,
                    and a storefront per renderer that uses AlfaKit components outside the panel.
                </p>
            </PageHero>

            <section aria-labelledby="renderers-title" className="border-b py-16">
                <div className="mx-auto max-w-screen-xl px-4">
                    <SectionHeading id="renderers-title" title="Pick a renderer">
                        The switcher in the top bar of each panel opens the page you are on in
                        another renderer, so you can compare them screen by screen.
                    </SectionHeading>
                    <ul className="mt-10 grid gap-4 md:grid-cols-3">
                        {links.map((link) => (
                            <li
                                key={link.renderer}
                                className="bg-card flex flex-col gap-4 rounded-xl border p-6"
                            >
                                <h3 className="text-xl font-bold">{link.renderer}</h3>
                                <p className="text-muted-foreground text-sm">
                                    Rendered by{' '}
                                    <code className="font-mono">
                                        @alfakit/{link.renderer.toLowerCase()}
                                    </code>
                                    .
                                </p>
                                <div className="mt-auto flex flex-wrap gap-2">
                                    <Button asChild size="sm">
                                        <a href={link.admin}>
                                            Admin panel{' '}
                                            <ArrowRight
                                                className="rtl:rotate-180"
                                                aria-hidden="true"
                                            />
                                        </a>
                                    </Button>
                                    <Button asChild size="sm" variant="outline">
                                        <a href={link.storefront}>
                                            <ShoppingBag aria-hidden="true" /> Storefront
                                        </a>
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <section aria-labelledby="tour-title" className="py-16">
                <div className="mx-auto max-w-screen-xl px-4">
                    <SectionHeading id="tour-title" title="What to look at">
                        The Showcase group in the sidebar walks through fields, layouts, actions,
                        tables, theming and performance; the theme menu in the top bar switches
                        between the built-in themes.
                    </SectionHeading>
                    <ul className="mt-10 grid gap-x-8 gap-y-12 md:grid-cols-2">
                        {TOUR.map((item) => (
                            <li key={item.name}>
                                <Screenshot
                                    name={item.name}
                                    alt={`${item.title} in the demo: ${item.text}`}
                                />
                                <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                                <p className="text-muted-foreground mt-1 text-sm">{item.text}</p>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-14 grid items-center gap-8 rounded-xl border p-6 sm:grid-cols-[auto_minmax(0,1fr)]">
                        <Screenshot
                            name="mobile-dashboard"
                            mobile
                            alt="The demo dashboard on a phone with bottom navigation."
                            className="mx-auto w-44"
                        />
                        <div>
                            <h3 className="text-lg font-bold">On a phone</h3>
                            <p className="text-muted-foreground mt-1 text-sm">
                                Turn on "Mobile preset" in the top bar of a panel for bottom
                                navigation, tables as cards and slide-over modals on small screens.
                            </p>
                            <p className="mt-4">
                                <Link
                                    href="/docs/getting-started/demo"
                                    className="text-primary inline-flex items-center gap-1.5 text-sm font-semibold"
                                >
                                    How the demo is built{' '}
                                    <ArrowRight
                                        className="size-4 rtl:rotate-180"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </SiteLayout>
    )
}
