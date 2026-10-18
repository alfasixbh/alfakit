import { FirstPartyLabel } from '@/components/site/alfa-six'
import { SiteLayout } from '@/components/site/site-layout'
import { CopyCommand, PageHero, SectionHeading, Terminal } from '@/components/site/ui'
import { cn } from '@/lib/utils'
import { Badge, Button } from '@alfakit/react'
import { Link } from '@inertiajs/react'
import { BookOpen, ExternalLink, Play, Plus, Puzzle } from 'lucide-react'
import { useMemo, useState } from 'react'

export interface Plugin {
    name: string
    package: string
    description: string
    author: { name: string; url?: string }
    category: string
    renderers: string[]
    alfakit: string
    firstParty?: boolean
    links: { repository?: string; docs?: string; packagist?: string; npm?: string }
}

export interface Bundle {
    name: string
    label: string
    description: string
    command: string
    plugins: string[]
    pluginNames: string[]
}

interface Props {
    plugins: Plugin[]
    categories: Record<string, string>
    renderers: string[]
    /** Slugs of the first-party plugins with a showcase page (/plugins/<slug>). */
    showcases: string[]
    bundles: Bundle[]
}

const RENDERER_LABELS: Record<string, string> = { react: 'React', vue: 'Vue', svelte: 'Svelte' }

export default function Plugins({ plugins, categories, renderers, showcases, bundles }: Props) {
    const [category, setCategory] = useState('all')
    const [renderer, setRenderer] = useState('all')

    const usedCategories = useMemo(
        () =>
            Object.entries(categories).filter(([key]) =>
                plugins.some((plugin) => plugin.category === key),
            ),
        [categories, plugins],
    )
    const visible = plugins.filter(
        (plugin) =>
            (category === 'all' || plugin.category === category) &&
            (renderer === 'all' || plugin.renderers.includes(renderer)),
    )

    return (
        <SiteLayout>
            <PageHero eyebrow="Plugins" title="Extend your panels">
                <p>
                    Packages that add resources, fields, widgets, themes or languages to AlfaKit,
                    with the renderers and AlfaKit versions each one supports.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                    <Button asChild>
                        <Link href="/plugins/submit">
                            <Plus aria-hidden="true" /> Submit a plugin
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="bg-background">
                        <Link href="/docs/panels/plugins">Build a plugin</Link>
                    </Button>
                </div>
            </PageHero>

            <div className="mx-auto max-w-screen-xl px-4 py-12">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <Filter
                        label="Category"
                        value={category}
                        onChange={setCategory}
                        options={[['all', 'All categories'], ...usedCategories]}
                    />
                    <Filter
                        label="Renderer"
                        value={renderer}
                        onChange={setRenderer}
                        options={[
                            ['all', 'All renderers'],
                            ...renderers.map((key): [string, string] => [
                                key,
                                RENDERER_LABELS[key] ?? key,
                            ]),
                        ]}
                    />
                    <p className="text-muted-foreground text-sm sm:ms-auto" aria-live="polite">
                        {visible.length === 1 ? '1 plugin' : `${visible.length} plugins`}
                    </p>
                </div>

                {visible.length > 0 ? (
                    <ul className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {visible.map((plugin) => (
                            <li key={plugin.package} className="min-w-0">
                                <PluginCard
                                    plugin={plugin}
                                    category={categories[plugin.category] ?? plugin.category}
                                    showcase={showcaseSlug(plugin, showcases)}
                                />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-muted-foreground mt-8 rounded-xl border border-dashed p-10 text-center">
                        No plugin matches these filters yet.
                    </p>
                )}

                <Bundles bundles={bundles} />

                <RunLocally />

                <aside className="bg-brand-cream dark:bg-card mt-12 flex flex-col items-start gap-4 rounded-xl border p-6 sm:flex-row sm:items-center">
                    <Puzzle className="text-primary size-8 shrink-0" aria-hidden="true" />
                    <div className="flex-1">
                        <h2 className="text-lg font-bold">The directory is just getting started</h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                            AlfaKit is new, so this list is short. If you have built a plugin, add
                            it with a pull request; the entry lives in a JSON file in the
                            repository.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="bg-background">
                        <Link href="/plugins/submit">How to submit</Link>
                    </Button>
                </aside>
            </div>
        </SiteLayout>
    )
}

function Filter({
    label,
    value,
    onChange,
    options,
}: {
    label: string
    value: string
    onChange: (value: string) => void
    options: Array<[string, string]>
}) {
    return (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
            {label}
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="border-input bg-background focus-visible:ring-ring/50 h-9 min-w-48 rounded-md border px-3 text-sm font-normal outline-none focus-visible:ring-[3px]"
            >
                {options.map(([key, text]) => (
                    <option key={key} value={key}>
                        {text}
                    </option>
                ))}
            </select>
        </label>
    )
}

/** The showcase page of a first-party plugin, when it has one. */
function showcaseSlug(plugin: Plugin, showcases: string[]): string | null {
    const slug = plugin.links.docs?.match(/^\/docs\/plugins\/([a-z0-9-]+)$/)?.[1] ?? null

    return plugin.firstParty && slug && showcases.includes(slug) ? slug : null
}

function Bundles({ bundles }: { bundles: Bundle[] }) {
    if (bundles.length === 0) return null

    return (
        <section aria-labelledby="bundles" className="mt-16">
            <SectionHeading eyebrow="Bundles" title="Start with a bundle" id="bundles">
                <p>
                    One command installs a set of plugins that belong together, registers them on
                    your panel with tidy navigation groups and publishes their migrations.
                </p>
            </SectionHeading>
            <ul className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {bundles.map((bundle) => (
                    <li key={bundle.name}>
                        <article className="bg-card flex h-full flex-col gap-4 rounded-xl border p-5">
                            <div>
                                <h3 className="text-lg font-bold">{bundle.label}</h3>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    {bundle.description}.
                                </p>
                            </div>
                            <ul className="flex flex-wrap gap-1.5" aria-label="Plugins">
                                {bundle.plugins.map((slug, index) => (
                                    <li key={slug}>
                                        <Link
                                            href={`/plugins/${slug}`}
                                            className="bg-muted hover:bg-muted/70 focus-visible:ring-ring/50 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium outline-none focus-visible:ring-[3px]"
                                        >
                                            {(bundle.pluginNames[index] ?? slug).replace(
                                                /^AlfaKit\s+/,
                                                '',
                                            )}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            <CopyCommand
                                value={bundle.command}
                                label={`${bundle.label} command`}
                                className="mt-auto"
                            />
                        </article>
                    </li>
                ))}
            </ul>
            <p className="text-muted-foreground mt-4 text-sm">
                Combine bundles with commas, add single plugins with{' '}
                <code className="font-mono">--plugins=</code>, and read{' '}
                <Link
                    href="/docs/getting-started/bundles"
                    className="text-foreground underline underline-offset-4"
                >
                    Bundles
                </Link>{' '}
                for what each one sets up.
            </p>
        </section>
    )
}

function RunLocally() {
    return (
        <section
            aria-labelledby="run-locally"
            className="mt-16 grid items-start gap-8 lg:grid-cols-[1fr_1.2fr]"
        >
            <SectionHeading eyebrow="Playground" title="Run it locally" id="run-locally">
                <p>
                    A new Laravel app with AlfaKit, every first-party plugin and demo data, in one
                    go. Sign in with the account the demo seeder prints.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                    <Button asChild variant="outline">
                        <Link href="/docs/getting-started/bundles#content-a-local-playground">
                            <Play aria-hidden="true" /> Playground guide
                        </Link>
                    </Button>
                </div>
            </SectionHeading>
            <div className="min-w-0">
                <Terminal
                    title="Terminal"
                    lines={[
                        '# A React app; use --vue or --svelte for the others',
                        'laravel new alfakit-playground --react --no-interaction',
                        'cd alfakit-playground',
                        'composer require alfasix/alfakit',
                        'php artisan alfakit:setup --mode=panel --bundle=all --plugins=all --demo --migrate --no-interaction',
                        'composer run dev',
                    ]}
                />
            </div>
        </section>
    )
}

function PluginCard({
    plugin,
    category,
    showcase,
}: {
    plugin: Plugin
    category: string
    showcase: string | null
}) {
    const docsIsLocal = plugin.links.docs?.startsWith('/')

    return (
        <article className="bg-card flex h-full flex-col gap-4 rounded-xl border p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-lg font-bold">{plugin.name}</h2>
                    <p className="text-muted-foreground truncate font-mono text-xs">
                        {plugin.package}
                    </p>
                </div>
                {plugin.firstParty && <FirstPartyLabel />}
            </div>
            <p className="text-muted-foreground text-sm">{plugin.description}</p>
            <dl className="mt-auto grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Author</dt>
                <dd>
                    {plugin.author.url ? (
                        <a href={plugin.author.url} className="hover:underline">
                            {plugin.author.name}
                        </a>
                    ) : (
                        plugin.author.name
                    )}
                </dd>
                <dt className="text-muted-foreground">Category</dt>
                <dd>{category}</dd>
                <dt className="text-muted-foreground">Renderers</dt>
                <dd className="flex flex-wrap gap-1">
                    {plugin.renderers.map((key) => (
                        <Badge key={key} variant="outline">
                            {RENDERER_LABELS[key] ?? key}
                        </Badge>
                    ))}
                </dd>
                <dt className="text-muted-foreground">AlfaKit</dt>
                <dd>
                    <code className="font-mono text-xs">
                        {plugin.alfakit === '*' ? 'any version (*)' : plugin.alfakit}
                    </code>
                </dd>
            </dl>
            <div className={cn('flex flex-wrap gap-2 border-t pt-4')}>
                {showcase && (
                    <Button asChild size="sm">
                        <Link href={`/plugins/${showcase}`}>
                            <Play aria-hidden="true" /> See it in action
                        </Link>
                    </Button>
                )}
                {plugin.links.docs &&
                    (docsIsLocal ? (
                        <Button asChild size="sm" variant="outline">
                            <Link href={plugin.links.docs}>
                                <BookOpen aria-hidden="true" /> Docs
                            </Link>
                        </Button>
                    ) : (
                        <Button asChild size="sm" variant="outline">
                            <a href={plugin.links.docs}>
                                <BookOpen aria-hidden="true" /> Docs
                            </a>
                        </Button>
                    ))}
                {plugin.links.repository && (
                    <Button asChild size="sm" variant="ghost">
                        <a href={plugin.links.repository}>
                            <ExternalLink aria-hidden="true" /> Source
                        </a>
                    </Button>
                )}
                {plugin.links.packagist && (
                    <Button asChild size="sm" variant="ghost">
                        <a href={plugin.links.packagist}>Packagist</a>
                    </Button>
                )}
                {plugin.links.npm && (
                    <Button asChild size="sm" variant="ghost">
                        <a href={plugin.links.npm}>npm</a>
                    </Button>
                )}
            </div>
        </article>
    )
}
