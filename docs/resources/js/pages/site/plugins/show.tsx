import { FirstPartyLabel } from '@/components/site/alfa-six'
import { ShowcaseClip, type Clip } from '@/components/site/showcase-clip'
import { SiteLayout } from '@/components/site/site-layout'
import { CodeWindow, CopyCommand, Eyebrow, GridLines, SectionHeading } from '@/components/site/ui'
import { cn } from '@/lib/utils'
import { Button } from '@alfakit/react'
import { Link } from '@inertiajs/react'
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Building2,
    Check,
    ExternalLink,
    Gauge,
    KeyRound,
    Languages,
    Layers,
    PilcrowRight,
    ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'

interface ShowcasePlugin {
    slug: string
    name: string
    package: string
    description: string
    renderers: string[]
    docsUrl: string
    repositoryUrl: string | null
    install: string
    highlights: string[]
    tour: string[]
    demo: Record<string, string>
    clips: Record<string, Clip>
    snippet: string | null
    worksWith: Array<{ slug: string; name: string; description: string }>
    bundles: string[]
}

interface Props {
    plugin: ShowcasePlugin
    login: { email: string; password: string }
}

const RENDERER_LABELS: Record<string, string> = { react: 'React', vue: 'Vue', svelte: 'Svelte' }

const BADGES = [
    { icon: Layers, label: 'React, Vue and Svelte', text: 'One PHP definition, three renderers' },
    { icon: PilcrowRight, label: 'Right to left', text: 'Logical layout, mirrored icons' },
    { icon: Languages, label: '13 languages', text: 'Every string translated' },
    { icon: Building2, label: 'Tenant-aware', text: 'Scoped to the current tenant' },
    { icon: ShieldCheck, label: 'Policy-checked', text: 'Authorised on the server' },
    { icon: Gauge, label: 'Opt-in and lazy', text: 'Loads only where it is used' },
]

export default function PluginShowcase({ plugin, login }: Props) {
    const renderers = Object.keys(plugin.demo)
    const [renderer, setRenderer] = useState(renderers[0] ?? 'react')
    const shortName = plugin.name.replace(/^AlfaKit\s+/, '')

    return (
        <SiteLayout>
            <section className="bg-brand-cream dark:bg-card relative isolate overflow-hidden border-b">
                <GridLines />
                <div className="relative mx-auto grid max-w-screen-xl items-center gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1fr_1.15fr]">
                    <div className="flex min-w-0 flex-col items-start gap-5">
                        <Link
                            href="/plugins"
                            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
                        >
                            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" /> All
                            plugins
                        </Link>
                        <FirstPartyLabel />
                        <div>
                            <Eyebrow className="mb-3">Plugin</Eyebrow>
                            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                                {shortName}
                            </h1>
                            <p className="text-muted-foreground mt-4 text-lg text-pretty">
                                {plugin.description}
                            </p>
                        </div>
                        <CopyCommand
                            value={plugin.install}
                            label="install command"
                            className="w-full max-w-md"
                        />
                        <div className="flex flex-wrap gap-3">
                            <Button asChild>
                                <a href={plugin.demo.react ?? plugin.demo[renderers[0]]}>
                                    Try it live{' '}
                                    <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
                                </a>
                            </Button>
                            <Button asChild variant="outline" className="bg-background">
                                <Link href={plugin.docsUrl}>
                                    <BookOpen aria-hidden="true" /> Documentation
                                </Link>
                            </Button>
                        </div>
                    </div>
                    <ShowcaseClip
                        clips={plugin.clips}
                        renderers={plugin.renderers}
                        title={shortName}
                    />
                </div>
            </section>

            <div className="mx-auto grid max-w-screen-xl gap-12 px-4 py-14 lg:grid-cols-[1.2fr_1fr]">
                <section aria-labelledby="highlights" className="min-w-0">
                    <SectionHeading eyebrow="Highlights" title="What you get" id="highlights" />
                    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                        {plugin.highlights.map((highlight) => (
                            <li key={highlight} className="flex items-start gap-3 text-sm">
                                <span className="bg-primary/10 text-primary mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full">
                                    <Check className="size-3.5" aria-hidden="true" />
                                </span>
                                {highlight}
                            </li>
                        ))}
                    </ul>

                    <ul
                        className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                        aria-label="Quality"
                    >
                        {BADGES.map(({ icon: Icon, label, text }) => (
                            <li
                                key={label}
                                className="bg-card flex items-start gap-3 rounded-xl border p-3"
                            >
                                <Icon
                                    className="text-primary mt-0.5 size-5 shrink-0"
                                    aria-hidden="true"
                                />
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold">{label}</span>
                                    <span className="text-muted-foreground block text-xs">
                                        {text}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section
                    aria-labelledby="try-it-live"
                    className="bg-card flex min-w-0 flex-col gap-5 self-start rounded-xl border p-6"
                >
                    <div>
                        <Eyebrow className="mb-2">Live demo</Eyebrow>
                        <h2 id="try-it-live" className="text-2xl font-bold tracking-tight">
                            Try it live
                        </h2>
                        <p className="text-muted-foreground mt-2 text-sm">
                            {shortName} runs in Maison Alfa, the demo shop. Pick a renderer: the
                            panel is the same PHP code in each.
                        </p>
                    </div>
                    <div
                        role="tablist"
                        aria-label="Renderer of the demo"
                        className="bg-muted inline-flex self-start rounded-lg p-1"
                    >
                        {renderers.map((key) => (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={key === renderer}
                                onClick={() => setRenderer(key)}
                                className={cn(
                                    'focus-visible:ring-ring/50 rounded-md px-3 py-1 text-sm font-medium outline-none focus-visible:ring-[3px]',
                                    key === renderer
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {RENDERER_LABELS[key] ?? key}
                            </button>
                        ))}
                    </div>
                    <ol className="flex flex-col gap-2 text-sm">
                        {plugin.tour.map((step, index) => (
                            <li key={step} className="flex items-start gap-3">
                                <span className="bg-brand-navy inline-flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] text-white dark:bg-[#f47a22]">
                                    {index + 1}
                                </span>
                                {step}
                            </li>
                        ))}
                    </ol>
                    <p className="text-muted-foreground flex items-start gap-2 text-xs">
                        <KeyRound className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span>
                            Sign in with <code className="font-mono">{login.email}</code> /{' '}
                            <code className="font-mono">{login.password}</code>. The data resets
                            every hour.
                        </span>
                    </p>
                    <Button asChild className="self-start">
                        <a href={plugin.demo[renderer]}>
                            Open in {RENDERER_LABELS[renderer] ?? renderer}{' '}
                            <ExternalLink aria-hidden="true" />
                        </a>
                    </Button>
                </section>
            </div>

            {plugin.snippet && (
                <section aria-labelledby="code" className="border-t">
                    <div className="mx-auto grid max-w-screen-xl items-start gap-10 px-4 py-14 lg:grid-cols-[1fr_1.4fr]">
                        <SectionHeading eyebrow="Code" title="A few lines of PHP" id="code">
                            <p>
                                Register the plugin on your panel; the forms, tables and pages it
                                adds are rendered by React, Vue or Svelte without any frontend code.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <Button asChild variant="outline">
                                    <Link href={plugin.docsUrl}>
                                        <BookOpen aria-hidden="true" /> Read the docs
                                    </Link>
                                </Button>
                                {plugin.repositoryUrl && (
                                    <Button asChild variant="ghost">
                                        <a href={plugin.repositoryUrl}>
                                            <ExternalLink aria-hidden="true" /> Source
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </SectionHeading>
                        <CodeWindow
                            title="app/Providers/Alfakit/AdminPanelProvider.php"
                            code={plugin.snippet}
                            language="php"
                        />
                    </div>
                </section>
            )}

            {(plugin.worksWith.length > 0 || plugin.bundles.length > 0) && (
                <section aria-labelledby="works-with" className="bg-muted/40 border-t">
                    <div className="mx-auto max-w-screen-xl px-4 py-14">
                        <SectionHeading
                            eyebrow="Better together"
                            title="Works great with"
                            id="works-with"
                        >
                            {plugin.bundles.length > 0 && (
                                <p>
                                    Part of the{' '}
                                    <Link
                                        href="/plugins#bundles"
                                        className="text-foreground underline underline-offset-4"
                                    >
                                        {plugin.bundles.join(', ')}
                                    </Link>{' '}
                                    {plugin.bundles.length === 1 ? 'bundle' : 'bundles'}.
                                </p>
                            )}
                        </SectionHeading>
                        <ul className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {plugin.worksWith.map((other) => (
                                <li key={other.slug}>
                                    <Link
                                        href={`/plugins/${other.slug}`}
                                        className="bg-card hover:border-primary/40 focus-visible:ring-ring/50 flex h-full flex-col gap-2 rounded-xl border p-5 outline-none focus-visible:ring-[3px]"
                                    >
                                        <span className="font-semibold">
                                            {other.name.replace(/^AlfaKit\s+/, '')}
                                        </span>
                                        <span className="text-muted-foreground text-sm">
                                            {other.description}
                                        </span>
                                        <span className="text-primary mt-auto inline-flex items-center gap-1 text-sm font-medium">
                                            See the plugin{' '}
                                            <ArrowRight
                                                className="size-4 rtl:rotate-180"
                                                aria-hidden="true"
                                            />
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            )}
        </SiteLayout>
    )
}
