import { FinalCta } from '@/components/site/cta'
import { Screenshot } from '@/components/site/screenshot'
import { SiteLayout } from '@/components/site/site-layout'
import { PageHero } from '@/components/site/ui'
import { Button } from '@alfakit/react'
import { Link, usePage } from '@inertiajs/react'
import { ArrowRight } from 'lucide-react'

interface Item {
    title: string
    text: string
    href: string
}

interface Area {
    id: string
    title: string
    intro: string
    shot?: { name: string; alt: string; dark?: boolean; mobile?: boolean }
    items: Item[]
}

const AREAS: Area[] = [
    {
        id: 'panels',
        title: 'Panels and navigation',
        intro: 'A panel is a section of your app with its own path, guard, navigation, theme and pages. An app can have several.',
        shot: {
            name: 'dashboard',
            alt: 'The demo panel with grouped sidebar navigation, a store switcher and a dashboard.',
        },
        items: [
            {
                title: 'Configuration',
                text: 'Path, guard, branding, colours, fonts, dark mode and middleware per panel.',
                href: '/docs/panels/configuration',
            },
            {
                title: 'Navigation',
                text: 'Groups, badges, sorting, collapsible groups and custom items.',
                href: '/docs/panels/navigation',
            },
            {
                title: 'Clusters and sub-navigation',
                text: 'Group related pages under one entry and add record sub-navigation.',
                href: '/docs/panels/clusters',
            },
            {
                title: 'Authentication',
                text: 'Login, registration, password reset, email verification and the profile page.',
                href: '/docs/panels/authentication',
            },
            {
                title: 'Multi-factor authentication',
                text: 'Authenticator apps with recovery codes and email codes, optional or required.',
                href: '/docs/panels/multi-factor-authentication',
            },
            {
                title: 'Impersonation',
                text: 'An ImpersonateAction with a banner to return to your own account.',
                href: '/docs/panels/impersonation',
            },
            {
                title: 'Global search',
                text: 'Search records of every resource from the top bar.',
                href: '/docs/resources/global-search',
            },
            {
                title: 'Plugins',
                text: 'Package resources, pages, widgets, assets and translations for reuse.',
                href: '/docs/panels/plugins',
            },
        ],
    },
    {
        id: 'resources',
        title: 'Resources',
        intro: 'A resource is CRUD for an Eloquent model: list, create, edit and view pages generated from one class.',
        shot: {
            name: 'order-view',
            alt: 'An order view page of the demo with tabs for details, items, payments, shipments and the status timeline.',
        },
        items: [
            {
                title: 'Pages',
                text: 'List, create, edit and view pages, list tabs and custom record pages.',
                href: '/docs/resources/pages',
            },
            {
                title: 'Relation managers',
                text: 'Manage related records in tables on the edit and view pages.',
                href: '/docs/resources/relation-managers',
            },
            {
                title: 'Nested resources',
                text: 'Resources that live under a parent record, with matching URLs.',
                href: '/docs/resources/nested-resources',
            },
            {
                title: 'Authorization',
                text: 'Laravel policies decide what each user can see and do.',
                href: '/docs/resources/authorization',
            },
        ],
    },
    {
        id: 'forms',
        title: 'Forms',
        intro: 'Forms are schemas of fields and layout components. State, validation and reactivity live on the server.',
        shot: {
            name: 'order-wizard',
            alt: 'The new order wizard of the demo with customer, items and review steps.',
        },
        items: [
            {
                title: 'Fields',
                text: 'Text, select, checkbox, radio, toggle, date and time, tags, key-value, colour, file upload and more.',
                href: '/docs/forms/fields',
            },
            {
                title: 'Choice and input fields',
                text: 'Toggle buttons, sliders, a code editor and money inputs.',
                href: '/docs/forms/choice-and-input-fields',
            },
            {
                title: 'Rich editor',
                text: 'Rich text with custom blocks, mentions and merge tags.',
                href: '/docs/forms/rich-editor',
            },
            {
                title: 'Builder and repeaters',
                text: 'Repeating items and typed blocks, virtualised when the list is long.',
                href: '/docs/forms/builder',
            },
            {
                title: 'Modal table select',
                text: 'Pick related records from a searchable table in a modal.',
                href: '/docs/forms/modal-table-select',
            },
            {
                title: 'Layout',
                text: 'Sections, tabs, wizards, grids, fieldsets, callouts and container-query columns.',
                href: '/docs/forms/layout',
            },
            {
                title: 'Validation',
                text: 'Laravel validation rules on each field, checked on the server.',
                href: '/docs/forms/validation',
            },
            {
                title: 'Reactivity',
                text: 'live() fields re-run closures on the server and refresh only what changed.',
                href: '/docs/forms/reactivity',
            },
            {
                title: 'Field actions',
                text: 'Prefix, suffix and hint actions on fields.',
                href: '/docs/forms/field-actions',
            },
            {
                title: 'Reusable schemas',
                text: 'Share fragments between forms or infer fields from a model.',
                href: '/docs/forms/reusable-schemas',
            },
        ],
    },
    {
        id: 'tables',
        title: 'Tables',
        intro: 'Tables list records with sorting, searching and filters kept in the query string, and reload only the table on change.',
        shot: {
            name: 'products-table',
            alt: 'The products table of the demo with images, badges, toggles, ratings and list tabs.',
        },
        items: [
            {
                title: 'Columns',
                text: 'Text, badge, icon, image, colour, toggle, select and input columns, with aggregates.',
                href: '/docs/tables/columns',
            },
            {
                title: 'Layout',
                text: 'Split, stack and panel layouts, card grids and collapsible rows.',
                href: '/docs/tables/layout',
            },
            {
                title: 'Filters',
                text: 'Select, ternary and trashed filters, a query builder and modal or deferred filters.',
                href: '/docs/tables/filters',
            },
            {
                title: 'Summaries',
                text: 'Sums, averages, counts and ranges below a column.',
                href: '/docs/tables/summaries',
            },
            {
                title: 'Grouping',
                text: 'Group rows by a column, collapsible, with group summaries.',
                href: '/docs/tables/grouping',
            },
            {
                title: 'Records',
                text: 'Eloquent queries or any array of records, with pagination modes.',
                href: '/docs/tables/records',
            },
            {
                title: 'Table actions',
                text: 'Record, header and bulk actions, inline editing and reordering.',
                href: '/docs/tables/actions',
            },
        ],
    },
    {
        id: 'actions',
        title: 'Actions',
        intro: 'Actions are buttons that do something: run code, open a modal form, confirm, or walk through a wizard.',
        shot: {
            name: 'import',
            alt: 'The import products modal of the demo with a CSV upload field.',
        },
        items: [
            {
                title: 'Overview',
                text: 'Hooks, authorization, rate limits, notifications and keyboard shortcuts.',
                href: '/docs/actions/overview',
            },
            {
                title: 'Modals',
                text: 'Modal and slide-over forms, wizards, nested modals and confirmations.',
                href: '/docs/actions/modals',
            },
            {
                title: 'Prebuilt actions',
                text: 'Create, edit, view, delete, restore, replicate, attach, associate and their bulk variants.',
                href: '/docs/actions/prebuilt',
            },
            {
                title: 'Import and export',
                text: 'CSV imports with column mapping and failed rows; CSV and XLSX exports.',
                href: '/docs/actions/import-export',
            },
        ],
    },
    {
        id: 'dashboards',
        title: 'Infolists, widgets and dashboards',
        intro: 'Show records read-only, and build dashboards from stats, charts, tables and your own widgets.',
        shot: {
            name: 'reports',
            alt: 'The sales report of the demo with stats and a revenue chart.',
        },
        items: [
            {
                title: 'Infolists',
                text: 'Entries and layouts to display a record, with actions on entries.',
                href: '/docs/infolists/overview',
            },
            {
                title: 'Widgets',
                text: 'Stats with sparklines, Chart.js charts, table widgets and custom widgets.',
                href: '/docs/widgets/overview',
            },
            {
                title: 'Dashboards',
                text: 'Several dashboards, page filters shared by widgets, lazy loading and polling.',
                href: '/docs/widgets/dashboards',
            },
            {
                title: 'Notifications',
                text: 'Toasts, a database inbox and live updates over Laravel Echo.',
                href: '/docs/notifications/overview',
            },
            {
                title: 'Custom pages',
                text: 'Pages with your own schema or your own frontend component.',
                href: '/docs/pages/custom-pages',
            },
        ],
    },
    {
        id: 'tenancy',
        title: 'Multi-tenancy',
        intro: 'Scope a panel to teams, stores or organisations. Every query, upload folder and notification follows the tenant.',
        shot: {
            name: 'customers',
            alt: 'The customers of one store in the demo, with the store switcher in the sidebar.',
        },
        items: [
            {
                title: 'Tenancy',
                text: 'Tenant switching, registration, profile, subdomains, custom domains and a billing hook.',
                href: '/docs/panels/tenancy',
            },
            {
                title: 'Database per tenant',
                text: 'A guide to one database per tenant.',
                href: '/docs/panels/database-per-tenant',
            },
        ],
    },
    {
        id: 'localization',
        title: 'Localization and right-to-left',
        intro: 'Panels speak any number of languages and mirror for right-to-left scripts. Numbers, money and dates follow the locale.',
        shot: { name: 'rtl', alt: 'The demo dashboard in Arabic, laid out right to left.' },
        items: [
            {
                title: 'Languages',
                text: 'Browser detection, a language menu, per-user locales and frontend translations.',
                href: '/docs/localization/overview',
            },
            {
                title: 'Translatable content',
                text: 'Fields that store one value per language.',
                href: '/docs/localization/translatable-content',
            },
            {
                title: 'Adding a language',
                text: 'Generate and check translation files with alfakit:lang commands.',
                href: '/docs/localization/adding-a-language',
            },
            {
                title: 'Right-to-left',
                text: 'Logical CSS, mirrored icons and direction-aware components.',
                href: '/docs/localization/rtl',
            },
            {
                title: 'Currencies and numbers',
                text: 'Every currency, minor units, money inputs and per-user timezones.',
                href: '/docs/localization/currencies-and-numbers',
            },
        ],
    },
    {
        id: 'design',
        title: 'Themes and design',
        intro: 'Six themes change the layout and the style of every part of the panel; design options adjust a theme further.',
        shot: {
            name: 'theme-corporate',
            alt: 'The demo products list with the corporate theme.',
            dark: false,
        },
        items: [
            {
                title: 'Themes',
                text: 'neutral, alfakit, minimal, soft, corporate and filament, or your own.',
                href: '/docs/design/themes',
            },
            {
                title: 'Design options',
                text: 'Layout, density, radius, inputs, buttons, tables and the mobile preset.',
                href: '/docs/design/design-options',
            },
            {
                title: 'Slots',
                text: 'Insert HTML, Blade views or schema components in 22 places.',
                href: '/docs/design/slots',
            },
            {
                title: 'Per-role design',
                text: 'Choose the theme and design per user, page, tenant or route.',
                href: '/docs/design/per-role-design',
            },
            {
                title: 'Customizing',
                text: 'Replace the sidebar, top bar or layouts with your own components.',
                href: '/docs/design/customizing',
            },
            {
                title: 'Icons',
                text: 'Lucide icons by name, aliases and a swappable icon set.',
                href: '/docs/design/icons',
            },
        ],
    },
    {
        id: 'mobile',
        title: 'On phones',
        intro: 'The mobile preset adds bottom navigation, shows tables as cards and opens modals as slide-overs, with 44px touch targets.',
        shot: {
            name: 'mobile-products',
            alt: 'The demo products list on a phone with the mobile preset.',
            mobile: true,
        },
        items: [
            {
                title: 'Mobile preset',
                text: 'Enable it with $panel->mobile().',
                href: '/docs/design/design-options',
            },
        ],
    },
    {
        id: 'outside-panels',
        title: 'Outside panels',
        intro: 'Use forms, tables, infolists, actions and widgets in your own Inertia pages, with the same PHP classes.',
        shot: { name: 'storefront', alt: 'The demo storefront home page.' },
        items: [
            {
                title: 'Overview',
                text: 'Standalone components passed as props and rendered with <AlfakitComponent>.',
                href: '/docs/standalone/overview',
            },
            {
                title: 'Forms',
                text: 'Contact forms, sign-ups and settings pages.',
                href: '/docs/standalone/forms',
            },
            {
                title: 'Tables',
                text: 'Filterable, sortable lists on any page.',
                href: '/docs/standalone/tables',
            },
            {
                title: 'Actions and infolists',
                text: 'Buttons with modals and read-only record views.',
                href: '/docs/standalone/actions-and-infolists',
            },
            {
                title: 'Widgets and notifications',
                text: 'Stats and charts, and toasts outside a panel.',
                href: '/docs/standalone/widgets-and-notifications',
            },
            {
                title: 'Testing',
                text: 'Test standalone components like panel pages.',
                href: '/docs/standalone/testing',
            },
        ],
    },
    {
        id: 'developers',
        title: 'For developers',
        intro: 'Generators, a debug panel, test helpers and a versioned schema contract keep a panel easy to build and to upgrade.',
        shot: {
            name: 'debug',
            alt: 'The debug panel open beside a categories table, showing the schema tree with visibility per component.',
        },
        items: [
            {
                title: 'Commands',
                text: 'make:alfakit-* generators, alfakit:install, alfakit:upgrade and more.',
                href: '/docs/advanced/commands',
            },
            {
                title: 'Debug panel',
                text: 'Schema tree, closures, form state, internal requests and server timings.',
                href: '/docs/advanced/debug-panel',
            },
            {
                title: 'Testing',
                text: 'alfakit()->testPage() helpers for forms, actions and tables.',
                href: '/docs/advanced/testing',
            },
            {
                title: 'Custom components',
                text: 'Register your own fields, columns, entries and widgets per renderer.',
                href: '/docs/adapters/custom-components',
            },
            {
                title: 'Ejecting components',
                text: 'Copy a built-in renderer component into your app and change it.',
                href: '/docs/advanced/ejecting-components',
            },
            {
                title: 'Server-side rendering',
                text: 'Optional SSR for every renderer.',
                href: '/docs/advanced/ssr',
            },
            {
                title: 'Stability and upgrades',
                text: 'A versioned schema contract, deprecations and plugin compatibility checks.',
                href: '/docs/advanced/stability',
            },
            {
                title: 'Accessibility',
                text: 'Labelled fields, keyboard paths and axe-checked pages in every renderer.',
                href: '/docs/advanced/accessibility',
            },
            {
                title: 'AI agents',
                text: 'Laravel Boost guidelines and skills, alfakit:ai and llms.txt.',
                href: '/docs/getting-started/ai-agents',
            },
            {
                title: 'Migrating from Filament',
                text: 'One command converts a Filament v3, v4 or v5 app and reports the rest.',
                href: '/docs/getting-started/migrating-from-filament',
            },
        ],
    },
]

export default function Features() {
    const { demoUrl } = usePage().props

    return (
        <SiteLayout>
            <PageHero
                eyebrow="Features"
                title="A tour of AlfaKit"
                aside={
                    <img
                        src="/brand/alfakit-mascot-color.svg"
                        alt="The AlfaKit fox mascot"
                        width="224"
                        height="258"
                        className="mx-auto hidden h-auto w-48 lg:block"
                    />
                }
            >
                <p>
                    Everything in a panel is defined in PHP and rendered by React, Vue or Svelte.
                    Each area below links to its documentation; the screenshots come from the live
                    demo.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                    <Button asChild>
                        <a href={demoUrl}>Open the live demo</a>
                    </Button>
                    <Button asChild variant="outline" className="bg-background">
                        <Link href="/docs/getting-started/introduction">Read the introduction</Link>
                    </Button>
                </div>
            </PageHero>

            <div className="mx-auto grid max-w-screen-xl gap-12 px-4 py-14 lg:grid-cols-[13rem_minmax(0,1fr)]">
                <nav aria-label="Feature areas" className="hidden lg:block">
                    <ul className="sticky top-24 flex flex-col gap-1 border-s text-sm">
                        {AREAS.map((area) => (
                            <li key={area.id}>
                                <a
                                    href={`#${area.id}`}
                                    className="text-muted-foreground hover:text-foreground hover:border-primary -ms-px block border-s border-transparent py-1 ps-4"
                                >
                                    {area.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="flex min-w-0 flex-col gap-20">
                    {AREAS.map((area) => (
                        <section
                            key={area.id}
                            id={area.id}
                            aria-labelledby={`${area.id}-title`}
                            className="scroll-mt-24"
                        >
                            <h2
                                id={`${area.id}-title`}
                                className="text-2xl font-bold tracking-tight sm:text-3xl"
                            >
                                {area.title}
                            </h2>
                            <p className="text-muted-foreground mt-3 max-w-3xl text-lg">
                                {area.intro}
                            </p>
                            {area.shot && (
                                <Screenshot
                                    name={area.shot.name}
                                    alt={area.shot.alt}
                                    dark={area.shot.dark ?? true}
                                    mobile={area.shot.mobile}
                                    className={area.shot.mobile ? 'mt-8 w-56' : 'mt-8'}
                                />
                            )}
                            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                                {area.items.map((item) => (
                                    <li key={item.title}>
                                        <Link
                                            href={item.href}
                                            className="hover:border-primary/50 hover:bg-accent/40 group flex h-full flex-col rounded-lg border p-4 transition-colors"
                                        >
                                            <span className="group-hover:text-primary flex items-center justify-between gap-2 font-semibold">
                                                {item.title}
                                                <ArrowRight
                                                    className="text-muted-foreground size-4 shrink-0 rtl:rotate-180"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <span className="text-muted-foreground mt-1 text-sm">
                                                {item.text}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            </div>

            <FinalCta demoUrl={demoUrl} />
        </SiteLayout>
    )
}
