import { AlfaSixLockup } from '@/components/site/alfa-six'
import { FinalCta } from '@/components/site/cta'
import { Screenshot } from '@/components/site/screenshot'
import { RELEASE_VERSION } from '@/components/site/site-header'
import { SiteLayout } from '@/components/site/site-layout'
import { CodeWindow, CopyCommand, Eyebrow, GridLines, SectionHeading } from '@/components/site/ui'
import { cn } from '@/lib/utils'
import { Link, usePage } from '@inertiajs/react'
import { ArrowRight, Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

// ---------------------------------------------------------------- Code shown in the hero

const RESOURCE_CODE = `class ProductResource extends Resource
{
    protected static ?string $model = Product::class;

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')->required()->live(onBlur: true)
                ->afterStateUpdated(fn (Set $set, ?string $state) =>
                    $set('slug', Str::slug($state ?? ''))),
            TextInput::make('slug')->required()->unique(),
            Select::make('brand_id')->relationship('brand', 'name')->searchable(),
            MoneyInput::make('price')->currency('USD'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')->searchable()->sortable(),
                TextColumn::make('brand.name')->sortable(),
                TextColumn::make('price')->money('USD')->sortable(),
            ])
            ->filters([SelectFilter::make('brand_id')->relationship('brand', 'name')])
            ->recordActions([EditAction::make()])
            ->bulkActions([DeleteBulkAction::make()]);
    }
}`

const RENDERERS = [
    {
        id: 'react',
        label: 'React',
        file: 'resources/js/alfakit/app.tsx',
        shot: 'products-table',
        kit: 'shadcn/ui',
    },
    {
        id: 'vue',
        label: 'Vue',
        file: 'resources/js/alfakit/app.ts',
        shot: 'vue-products',
        kit: 'shadcn-vue',
    },
    {
        id: 'svelte',
        label: 'Svelte',
        file: 'resources/js/alfakit/app.ts',
        shot: 'svelte-products',
        kit: 'shadcn-svelte',
    },
] as const

const entryCode = (renderer: string) => `import { createAlfakit } from '@alfakit/${renderer}'

void createAlfakit({
    components: {
        // your own fields, columns, widgets and pages
    },
})`

// ---------------------------------------------------------------- Facts

/**
 * Counted from the repository (2026-10-13): the renderer packages, `en` plus the packs in
 * packages/translations/lang, the themes in packages/core/themes.css, the field classes in
 * src/Forms/Components, the column classes in src/Tables/Columns and the make:alfakit-*
 * commands in src/Commands.
 */
const NUMBERS = [
    { value: '3', label: 'Renderers', detail: 'React, Vue and Svelte' },
    { value: '25', label: 'Form fields', detail: 'From text input to rich editor' },
    { value: '9', label: 'Column types', detail: 'Text, image, toggle, select…' },
    { value: '6', label: 'Themes', detail: 'Structure, not only colour' },
    { value: '13', label: 'Languages', detail: 'Right to left included' },
    { value: '24', label: 'Generators', detail: 'make:alfakit-* commands' },
]

// Medians of 20 runs on one machine against Filament v5.10 with the same 10,000-row data set,
// AlfaKit (React) with SSR off, both with APP_DEBUG=false (benchmarks/run.mjs, run of 2026-10-18
// on an idle machine; raw samples in benchmarks/results/2026-10-18-z9-csr.json).
const PERFORMANCE = [
    { scenario: 'List page, 25 rows', alfakit: '33 ms · 83 KB', filament: '43 ms · 818 KB' },
    { scenario: 'Sort a column', alfakit: '21 ms · 26 KB', filament: '40 ms · 791 KB' },
    { scenario: 'Search', alfakit: '22 ms · 26 KB', filament: '40 ms · 794 KB' },
    {
        scenario: 'live() field, 100-item repeater',
        alfakit: '21 ms · 0.3 KB',
        filament: '61 ms · 1.80 MB',
    },
    {
        scenario: 'Form with a 500-item repeater',
        alfakit: '64 ms · 384 KB',
        filament: '294 ms · 8.65 MB',
    },
]

// Ratios of the medians above, rounded down: 293.7/64.2 = 4.57, 790.5/25.7 = 30.8,
// 60.8/20.9 = 2.92.
const HEADLINES = [
    { value: '4.5×', text: 'faster first byte on a form with a 500-item repeater' },
    { value: '30×', text: 'smaller response when sorting a column' },
    { value: '2.9×', text: 'faster live() update on a 100-item form' },
]

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'ar', label: 'العربية' },
    { code: 'de', label: 'Deutsch' },
    { code: 'es', label: 'Español' },
    { code: 'fa', label: 'فارسی' },
    { code: 'fr', label: 'Français' },
    { code: 'it', label: 'Italiano' },
    { code: 'ja', label: '日本語' },
    { code: 'nl', label: 'Nederlands' },
    { code: 'pt-BR', label: 'Português' },
    { code: 'ru', label: 'Русский' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'zh-CN', label: '简体中文' },
]

// Primary and background tokens of each theme (packages/react/src/styles.css, packages/core/themes.css).
const THEMES = [
    { id: 'neutral', swatch: ['oklch(0.205 0 0)', 'oklch(1 0 0)'] },
    { id: 'alfakit', swatch: ['oklch(0.359 0.116 256.3)', 'oklch(0.987 0.011 76.6)'] },
    { id: 'minimal', swatch: ['oklch(0.15 0 0)', 'oklch(1 0 0)'] },
    { id: 'soft', swatch: ['oklch(0.52 0.13 165)', 'oklch(0.95 0.018 80)'] },
    { id: 'corporate', swatch: ['oklch(0.49 0.2 262)', 'oklch(0.24 0.05 262)'] },
    { id: 'filament', swatch: ['oklch(0.56 0.179 58.318)', 'oklch(0.985 0.002 247.839)'] },
]

const MORE_LINKS = [
    { label: 'Actions and modals', href: '/docs/actions/overview' },
    { label: 'Imports and exports', href: '/docs/actions/import-export' },
    { label: 'Infolists', href: '/docs/infolists/overview' },
    { label: 'Dashboards and widgets', href: '/docs/widgets/overview' },
    { label: 'Notifications', href: '/docs/notifications/overview' },
    { label: 'Authentication and MFA', href: '/docs/panels/authentication' },
    { label: 'Plugins', href: '/docs/panels/plugins' },
    { label: 'Server-side rendering', href: '/docs/advanced/ssr' },
    { label: 'Debug panel', href: '/docs/advanced/debug-panel' },
    { label: 'Generators', href: '/docs/advanced/commands' },
    { label: 'Accessibility', href: '/docs/advanced/accessibility' },
    { label: 'Slots and design options', href: '/docs/design/slots' },
]

export default function Welcome() {
    const { demoUrl } = usePage().props

    return (
        <SiteLayout>
            <Hero demoUrl={demoUrl} />
            <Bento />
            <Numbers />
            <Showcase />
            <Performance />
            <ThankYou />
            <FinalCta demoUrl={demoUrl} />
            <MadeByAlfaSix />
        </SiteLayout>
    )
}

// ---------------------------------------------------------------- Hero

function Hero({ demoUrl }: { demoUrl: string }) {
    return (
        <section aria-labelledby="hero-title" className="relative">
            <div className="on-brand bg-brand-navy relative isolate overflow-hidden text-white">
                <HeroPattern />
                <div className="mx-auto flex max-w-screen-xl flex-col items-center px-4 pt-14 pb-40 text-center sm:pt-20 sm:pb-52">
                    <RendererPill />
                    <h1
                        id="hero-title"
                        className="mt-7 max-w-4xl text-4xl leading-[1.08] font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl"
                    >
                        Your Laravel foundation.{' '}
                        <span className="text-[#ffd9b8]">Your frontend choice.</span>
                    </h1>
                    <p className="mt-6 max-w-2xl text-lg text-pretty text-[#d6e2f2] sm:text-xl">
                        The Filament experience for React, Vue and Svelte: define panels in PHP,
                        render them with shadcn components through Inertia.
                    </p>
                    <div className="mt-9 flex flex-wrap justify-center gap-3">
                        <Link
                            href="/docs"
                            className="bg-brand-orange inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold text-[#14263d] transition-colors hover:bg-[#f68d40]"
                        >
                            Get started{' '}
                            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                        </Link>
                        <a
                            href={demoUrl}
                            className="inline-flex h-11 items-center rounded-full border border-white/35 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                        >
                            Live demo
                        </a>
                    </div>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-[#b5c9e4]">
                        <Link
                            href="/changelog"
                            className="rounded-full border border-[#f47a22]/60 bg-[#f47a22]/15 px-2.5 py-0.5 text-xs font-semibold text-[#ffd9b8] transition-colors hover:bg-[#f47a22]/25"
                        >
                            Public beta · v{RELEASE_VERSION}
                        </Link>
                        <p>PHP 8.3+ · Laravel 13 · Inertia 3 · Open source · MIT</p>
                    </div>
                </div>
            </div>
            <div className="relative mx-auto -mt-32 max-w-screen-xl px-4 sm:-mt-40">
                <HeroCode />
            </div>
        </section>
    )
}

/** Deterministic pixel art in lighter navy, denser towards the sides (no randomness at render). */
const PIXELS = (() => {
    const cells: Array<{ x: number; y: number; tone: number }> = []
    let seed = 20261013
    const random = () => {
        seed = (seed * 16807) % 2147483647
        return seed / 2147483647
    }
    for (let y = 0; y < 28; y++) {
        for (let x = 0; x < 60; x++) {
            const edge = Math.abs(x - 29.5) / 29.5
            const chance = 0.006 + Math.pow(edge, 3) * 0.36 * (1 - y / 30)
            // Keep the middle clear behind the headline.
            if (random() < chance && edge > 0.5) cells.push({ x, y, tone: random() })
        }
    }
    return cells
})()

function HeroPattern() {
    return (
        <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
            viewBox="0 0 1440 672"
            preserveAspectRatio="xMidYMin slice"
        >
            <defs>
                <pattern id="hero-dots" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="12" cy="12" r="1" fill="#2a63a8" />
                </pattern>
                <linearGradient id="hero-fade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#073b78" stopOpacity="0" />
                    <stop offset="1" stopColor="#073b78" stopOpacity="1" />
                </linearGradient>
            </defs>
            <rect width="1440" height="672" fill="url(#hero-dots)" opacity="0.55" />
            {PIXELS.map((cell) => (
                <rect
                    key={`${cell.x}-${cell.y}`}
                    x={cell.x * 24 + 2}
                    y={cell.y * 24 + 2}
                    width="20"
                    height="20"
                    rx="2"
                    fill={cell.tone > 0.97 ? '#f47a22' : cell.tone > 0.6 ? '#1a5ca8' : '#0e4a90'}
                    opacity={cell.tone > 0.97 ? 0.6 : 0.4 + cell.tone * 0.3}
                />
            ))}
            <rect y="420" width="1440" height="252" fill="url(#hero-fade)" />
        </svg>
    )
}

function RendererPill() {
    return (
        <p className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.07] py-1 ps-1.5 pe-4 text-sm font-medium text-white/90">
            <span className="flex -space-x-1.5 rtl:space-x-reverse" aria-hidden="true">
                <LogoBubble>
                    <ReactLogo />
                </LogoBubble>
                <LogoBubble>
                    <VueLogo />
                </LogoBubble>
                <LogoBubble>
                    <SvelteLogo />
                </LogoBubble>
            </span>
            React, Vue and Svelte on Laravel
        </p>
    )
}

function LogoBubble({ children }: { children: ReactNode }) {
    return (
        <span className="ring-brand-navy flex size-7 items-center justify-center rounded-full bg-white ring-2">
            {children}
        </span>
    )
}

function ReactLogo({ className = 'size-4' }: { className?: string }) {
    return (
        <svg viewBox="-11.5 -10.23 23 20.46" className={className} aria-hidden="true">
            <circle r="2.05" fill="#087ea4" />
            <g stroke="#087ea4" strokeWidth="1" fill="none">
                <ellipse rx="11" ry="4.2" />
                <ellipse rx="11" ry="4.2" transform="rotate(60)" />
                <ellipse rx="11" ry="4.2" transform="rotate(120)" />
            </g>
        </svg>
    )
}

function VueLogo({ className = 'size-4' }: { className?: string }) {
    return (
        <svg viewBox="0 0 256 221" className={className} aria-hidden="true">
            <path fill="#41b883" d="M204.8 0H256L128 220.8L0 0h97.92L128 51.2L157.44 0h47.36Z" />
            <path fill="#41b883" d="m0 0l128 220.8L256 0h-51.2L128 132.48L50.56 0H0Z" />
            <path fill="#35495e" d="M50.56 0L128 133.12L204.8 0h-47.36L128 51.2L97.92 0H50.56Z" />
        </svg>
    )
}

function SvelteLogo({ className = 'size-4' }: { className?: string }) {
    return (
        <svg viewBox="0 0 256 308" className={className} aria-hidden="true">
            <path
                fill="#ff3e00"
                d="M239.682 40.707C211.113-.182 154.69-12.301 113.895 13.69L42.247 59.356a82.198 82.198 0 0 0-37.135 55.056a86.566 86.566 0 0 0 8.536 55.576a82.425 82.425 0 0 0-12.296 30.719a87.596 87.596 0 0 0 14.964 66.244c28.574 40.893 84.997 53.007 125.787 27.016l71.648-45.664a82.182 82.182 0 0 0 37.135-55.057a86.601 86.601 0 0 0-8.53-55.577a82.409 82.409 0 0 0 12.29-30.718a87.573 87.573 0 0 0-14.963-66.244"
            />
            <path
                fill="#fff"
                d="M106.889 270.841c-23.102 6.007-47.497-3.036-61.103-22.648a52.685 52.685 0 0 1-9.003-39.85a49.978 49.978 0 0 1 1.713-6.693l1.35-4.115l3.671 2.697a92.447 92.447 0 0 0 28.036 14.007l2.663.808l-.245 2.659a16.067 16.067 0 0 0 2.89 10.656a17.143 17.143 0 0 0 18.397 6.828a15.786 15.786 0 0 0 4.403-1.935l71.67-45.672a14.922 14.922 0 0 0 6.734-9.977a15.923 15.923 0 0 0-2.713-12.011a17.156 17.156 0 0 0-18.404-6.832a15.78 15.78 0 0 0-4.396 1.933l-27.35 17.434a52.298 52.298 0 0 1-14.553 6.391c-23.101 6.007-47.497-3.036-61.101-22.649a52.681 52.681 0 0 1-9.004-39.849a49.428 49.428 0 0 1 22.34-33.114l71.664-45.677a52.218 52.218 0 0 1 14.563-6.398c23.101-6.007 47.497 3.036 61.101 22.648a52.685 52.685 0 0 1 9.004 39.85a50.559 50.559 0 0 1-1.713 6.692l-1.35 4.116l-3.67-2.693a92.373 92.373 0 0 0-28.037-14.013l-2.664-.809l.246-2.658a16.099 16.099 0 0 0-2.89-10.656a17.143 17.143 0 0 0-18.398-6.828a15.786 15.786 0 0 0-4.402 1.935l-71.67 45.674a14.898 14.898 0 0 0-6.73 9.975a15.9 15.9 0 0 0 2.709 12.012a17.156 17.156 0 0 0 18.404 6.832a15.841 15.841 0 0 0 4.402-1.935l27.345-17.427a52.147 52.147 0 0 1 14.552-6.397c23.101-6.006 47.497 3.037 61.102 22.65a52.681 52.681 0 0 1 9.003 39.848a49.453 49.453 0 0 1-22.34 33.12l-71.664 45.673a52.218 52.218 0 0 1-14.563 6.398"
            />
        </svg>
    )
}

const LOGOS = { react: ReactLogo, vue: VueLogo, svelte: SvelteLogo } as const

/** Keyboard support for a row of tabs (arrows, Home, End), as in the WAI-ARIA tabs pattern. */
function useTabs(count: number) {
    const [active, setActive] = useState(0)
    const tabs = useRef<Array<HTMLButtonElement | null>>([])

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
        const keys: Record<string, number> = {
            ArrowRight: rtl ? -1 : 1,
            ArrowLeft: rtl ? 1 : -1,
        }
        let next: number | null = null
        if (event.key in keys) next = (active + keys[event.key] + count) % count
        if (event.key === 'Home') next = 0
        if (event.key === 'End') next = count - 1
        if (next === null) return
        event.preventDefault()
        setActive(next)
        tabs.current[next]?.focus()
    }

    return { active, setActive, tabs, onKeyDown }
}

function HeroCode() {
    const { active, setActive, tabs, onKeyDown } = useTabs(RENDERERS.length)
    const renderer = RENDERERS[active]

    const tabList = (
        <div
            role="tablist"
            aria-label="Renderer"
            onKeyDown={onKeyDown}
            className="flex gap-0.5 rounded-full bg-white/5 p-0.5"
        >
            {RENDERERS.map((item, index) => {
                const Icon = LOGOS[item.id]
                return (
                    <button
                        key={item.id}
                        ref={(element) => {
                            tabs.current[index] = element
                        }}
                        type="button"
                        role="tab"
                        id={`entry-tab-${item.id}`}
                        aria-selected={index === active}
                        aria-controls="entry-panel"
                        tabIndex={index === active ? 0 : -1}
                        onClick={() => setActive(index)}
                        className={cn(
                            'flex items-center gap-1.5 rounded-full px-2.5 py-1 font-sans text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#fff4e4]',
                            index === active
                                ? 'bg-white text-[#14263d]'
                                : 'text-[#9db9de] hover:text-white',
                        )}
                    >
                        <Icon className="size-3.5" />
                        {item.label}
                    </button>
                )
            })}
        </div>
    )

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-5">
            <CodeWindow
                title="app/Alfakit/Resources/ProductResource.php"
                language="php"
                code={RESOURCE_CODE}
            />
            <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
                <div
                    id="entry-panel"
                    role="tabpanel"
                    aria-labelledby={`entry-tab-${renderer.id}`}
                    className="min-w-0"
                >
                    <CodeWindow
                        title={renderer.file}
                        tabs={tabList}
                        language="ts"
                        code={entryCode(renderer.id)}
                    />
                </div>
                <div className="bg-card text-card-foreground flex min-w-0 flex-1 flex-col gap-4 rounded-xl border p-5 shadow-[0_30px_80px_-40px_rgb(4_20_43/0.45)] sm:p-6">
                    <Eyebrow>Install</Eyebrow>
                    <div className="flex flex-col gap-2">
                        <CopyCommand
                            value="composer require alfasix/alfakit"
                            label="install command"
                        />
                        <CopyCommand value="php artisan alfakit:install" label="install command" />
                    </div>
                    <Eyebrow className="mt-2">One schema contract</Eyebrow>
                    <p className="text-muted-foreground text-sm leading-6">
                        The PHP resource is the same for every renderer. Only the entry file and the
                        npm package change:{' '}
                        <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]">
                            @alfakit/{renderer.id}
                        </code>{' '}
                        draws it with {renderer.kit}.
                    </p>
                    <Link
                        href="/docs/getting-started/quick-start"
                        className="text-primary mt-auto inline-flex items-center gap-1.5 text-sm font-semibold"
                    >
                        Quick start{' '}
                        <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------- Bento grid

function Bento() {
    return (
        <section aria-labelledby="bento-title" className="pt-20 pb-20 sm:pt-28">
            <div className="mx-auto max-w-screen-xl px-4">
                <SectionHeading
                    id="bento-title"
                    eyebrow="What's in the box"
                    title="Everything an admin panel needs, defined in PHP"
                >
                    One Composer package for the server and one npm package for your renderer.
                    Validation, authorisation and queries stay in Laravel; the frontend draws what
                    the schema describes.
                </SectionHeading>

                <div className="mt-12 grid border-s border-t md:grid-cols-2 lg:grid-cols-3">
                    <Card
                        eyebrow="Resources"
                        title="CRUD from one class"
                        href="/docs/resources/overview"
                        className="md:col-span-2"
                        text="List, create, edit and view pages, relation managers, nested and singular resources, with policies checked on every action."
                    >
                        <div className="relative h-56 overflow-hidden mask-b-from-60% sm:h-64">
                            <Screenshot
                                name="products-table"
                                alt="The demo's products list with images, brands, categories, prices and stock."
                                className="w-[44rem] max-w-none sm:w-full"
                            />
                        </div>
                    </Card>

                    <Card
                        eyebrow="Forms"
                        title="Live fields, server validation"
                        href="/docs/forms/overview"
                        text={
                            <>
                                A <C>live()</C> field re-runs your closures in PHP and gets back
                                only the components that changed. Rules run on the server.
                            </>
                        }
                    >
                        <MiniForm />
                    </Card>

                    <Card
                        eyebrow="Tables"
                        title="Filters, bulk actions, export"
                        href="/docs/tables/overview"
                        text="Search, sort, filters and a query builder kept in the URL; bulk actions and CSV or XLSX exports that follow the filters."
                    >
                        <MiniTable />
                    </Card>

                    <Card
                        eyebrow="Renderers"
                        title="Three frameworks, one PHP API"
                        href="/docs/adapters/overview"
                        text={
                            <>
                                <C>@alfakit/react</C>, <C>@alfakit/vue</C> and{' '}
                                <C>@alfakit/svelte</C> implement the same schema contract with
                                shadcn components.
                            </>
                        }
                    >
                        <MiniRenderers />
                    </Card>

                    <Card
                        eyebrow="Multi-tenancy"
                        title="One panel, many tenants"
                        href="/docs/panels/tenancy"
                        text={
                            <>
                                <C>$panel-&gt;tenant()</C> scopes records, adds a switcher, and
                                supports subdomains and custom domains. <C>alfakit:tenancy:check</C>{' '}
                                audits your queries.
                            </>
                        }
                    >
                        <MiniTenants />
                    </Card>

                    <Card
                        eyebrow="Themes · RTL · i18n"
                        title="Six themes, 13 languages, both directions"
                        href="/docs/design/themes"
                        className="md:col-span-2"
                        text="Themes change layout, navigation and surfaces, not only colours. Layouts mirror for right-to-left scripts; numbers, money and dates follow the panel's locale."
                    >
                        <MiniThemes />
                    </Card>

                    <Card
                        eyebrow="Standalone"
                        title="Components in your own pages"
                        href="/docs/standalone/overview"
                        text={
                            <>
                                Pass a PHP form, table, infolist or widget to any Inertia page and
                                render it with <C>&lt;AlfakitComponent&gt;</C>.
                            </>
                        }
                    >
                        <MiniCode language="tsx" code={`<AlfakitComponent component={form} />`} />
                    </Card>

                    <Card
                        eyebrow="App pages"
                        title="Screens that aren't CRUD"
                        href="/docs/pages/app-pages"
                        text={
                            <>
                                Write a point of sale or a kanban board as your own component and
                                call PHP methods marked <C>#[Expose]</C>, with validation and auth
                                handled.
                            </>
                        }
                    >
                        <MiniPos />
                    </Card>

                    <Card
                        eyebrow="Migration"
                        title="Coming from Filament"
                        href="/docs/getting-started/migrating-from-filament"
                        text="One command converts a Filament v3, v4 or v5 app and writes a report of what needs a decision."
                    >
                        <MiniCode
                            language="bash"
                            code={`php artisan alfakit:migrate-from-filament --dry-run`}
                        />
                    </Card>

                    <Card
                        eyebrow="AI agents"
                        title="Docs your agent can read"
                        href="/ai"
                        text={
                            <>
                                A Laravel Boost guideline and skills ship with the package, plus{' '}
                                <C>llms.txt</C> and Markdown for every docs page.
                            </>
                        }
                    >
                        <MiniCode
                            language="bash"
                            code={`php artisan boost:install\nphp artisan alfakit:ai`}
                        />
                    </Card>

                    <Card
                        eyebrow="Testing"
                        title="Pest helpers for pages"
                        href="/docs/advanced/testing"
                        text="Fill forms, call actions and assert table records through the same endpoints the renderer uses."
                    >
                        <MiniCode
                            language="php"
                            code={`alfakit()->testPage(EditPost::class, ['record' => $post])
    ->fillForm(['title' => 'Hello World'])
    ->call('save')
    ->assertHasNoFormErrors();`}
                        />
                    </Card>

                    <div className="flex flex-col gap-4 border-e border-b p-6 md:col-span-1 lg:col-span-2">
                        <Eyebrow>And more</Eyebrow>
                        <h3 className="text-xl font-semibold tracking-tight">
                            The rest of the toolkit
                        </h3>
                        <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                            {MORE_LINKS.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
                                    >
                                        <ArrowRight
                                            className="text-brand-orange size-3.5 shrink-0 rtl:rotate-180"
                                            aria-hidden="true"
                                        />
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <Link
                            href="/features"
                            className="text-primary mt-auto inline-flex items-center gap-1.5 text-sm font-semibold"
                        >
                            Take the full feature tour{' '}
                            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}

/** A bento cell: eyebrow, linked title (the whole cell is the hit area), sentence, art. */
function Card({
    eyebrow,
    title,
    text,
    href,
    children,
    className,
}: {
    eyebrow: string
    title: string
    text: ReactNode
    href: string
    children: ReactNode
    className?: string
}) {
    return (
        <article
            className={cn(
                'group hover:bg-muted/40 relative flex min-w-0 flex-col gap-3 overflow-hidden border-e border-b p-6 transition-colors',
                className,
            )}
        >
            <Eyebrow>{eyebrow}</Eyebrow>
            <h3 className="text-xl font-semibold tracking-tight">
                <Link
                    href={href}
                    className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-sm after:focus-visible:outline-2 after:focus-visible:-outline-offset-4 after:focus-visible:outline-[var(--ring)]"
                >
                    {title}
                </Link>
            </h3>
            <p className="text-muted-foreground text-sm leading-6">{text}</p>
            <div className="mt-auto pt-4" aria-hidden="true">
                {children}
            </div>
        </article>
    )
}

/** Inline code in card copy. */
function C({ children }: { children: ReactNode }) {
    return (
        <code className="bg-muted text-foreground rounded px-1 py-0.5 font-mono text-[0.85em]">
            {children}
        </code>
    )
}

function MiniPanel({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div
            className={cn(
                'bg-background rounded-lg border p-3 text-xs shadow-[0_12px_30px_-20px_rgb(7_59_120/0.35)]',
                className,
            )}
        >
            {children}
        </div>
    )
}

function MiniForm() {
    return (
        <MiniPanel className="flex flex-col gap-2.5">
            <div>
                <div className="mb-1 flex items-center justify-between font-medium">
                    Name
                    <span className="bg-secondary text-secondary-foreground rounded px-1.5 font-mono text-[10px]">
                        live()
                    </span>
                </div>
                <div className="ring-ring/40 rounded-md border px-2 py-1.5 ring-2">Oud Royal</div>
            </div>
            <div>
                <div className="mb-1 font-medium">Slug</div>
                <div className="bg-muted/60 text-muted-foreground rounded-md border px-2 py-1.5 font-mono">
                    oud-royal
                </div>
            </div>
            <div>
                <div className="mb-1 font-medium">Price</div>
                <div className="rounded-md border border-red-500/70 px-2 py-1.5">&nbsp;</div>
                <div className="mt-1 text-red-700 dark:text-red-300">
                    The price field is required.
                </div>
            </div>
        </MiniPanel>
    )
}

function MiniTable() {
    const rows = [
        { item: 'Oud Royal', brand: 'Maison', checked: true },
        { item: 'Amber Noir', brand: 'Atelier', checked: true },
        { item: 'Rose Dune', brand: 'Maison', checked: false },
    ]

    return (
        <MiniPanel className="flex flex-col gap-2 p-0">
            <div className="flex flex-wrap items-center gap-1.5 border-b p-2">
                <span className="text-muted-foreground flex items-center gap-1 rounded-md border px-2 py-1">
                    <Search className="size-3" /> Search
                </span>
                <span className="bg-secondary text-secondary-foreground flex items-center gap-1 rounded-full px-2 py-0.5">
                    Brand: Maison <X className="size-3" />
                </span>
            </div>
            <ul className="px-2">
                {rows.map((row) => (
                    <li
                        key={row.item}
                        className="flex items-center gap-2 border-b py-1.5 last:border-0"
                    >
                        <span
                            className={cn(
                                'flex size-3.5 items-center justify-center rounded-sm border',
                                row.checked && 'bg-primary border-primary text-primary-foreground',
                            )}
                        >
                            {row.checked && <Check className="size-2.5" />}
                        </span>
                        <span className="flex-1 font-medium">{row.item}</span>
                        <span className="text-muted-foreground">{row.brand}</span>
                    </li>
                ))}
            </ul>
            <div className="bg-muted/60 flex items-center gap-2 rounded-b-lg border-t px-2 py-1.5">
                <span className="font-medium">2 selected</span>
                <span className="ms-auto rounded-md border px-1.5 py-0.5">Export</span>
                <span className="rounded-md border border-red-500/60 px-1.5 py-0.5 text-red-700 dark:text-red-300">
                    Delete
                </span>
            </div>
        </MiniPanel>
    )
}

function MiniRenderers() {
    return (
        <div className="flex flex-col items-center gap-3">
            <span className="bg-brand-navy rounded-md px-3 py-1.5 font-mono text-xs text-white dark:bg-[#17304f]">
                toSchema() → JSON
            </span>
            <svg viewBox="0 0 200 24" className="text-border h-6 w-48" fill="none">
                <path
                    d="M100 0v8M100 8H30v16M100 8v16M100 8h70v16"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
            </svg>
            <div className="grid w-full grid-cols-3 gap-2">
                {RENDERERS.map((item) => {
                    const Icon = LOGOS[item.id]
                    return (
                        <span
                            key={item.id}
                            className="bg-background flex flex-col items-center gap-1.5 rounded-lg border py-3 text-xs font-medium"
                        >
                            <Icon className="size-6" />
                            {item.label}
                        </span>
                    )
                })}
            </div>
        </div>
    )
}

function MiniTenants() {
    const tenants = ['Manama store', 'Riyadh store', 'Doha store']

    return (
        <MiniPanel className="flex flex-col gap-1 p-1.5">
            <div className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                <span className="bg-brand-orange flex size-5 items-center justify-center rounded text-[10px] font-bold text-[#14263d]">
                    M
                </span>
                <span className="flex-1 font-medium">Manama store</span>
                <ChevronsUpDown className="text-muted-foreground size-3.5" />
            </div>
            <ul className="mt-0.5">
                {tenants.map((tenant, index) => (
                    <li
                        key={tenant}
                        className={cn(
                            'flex items-center gap-2 rounded-md px-2 py-1.5',
                            index === 0 && 'bg-accent',
                        )}
                    >
                        <span className="flex-1">{tenant}</span>
                        {index === 0 && <Check className="text-primary size-3.5" />}
                    </li>
                ))}
            </ul>
        </MiniPanel>
    )
}

function MiniThemes() {
    return (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <ul className="grid grid-cols-3 gap-2">
                {THEMES.map((theme) => (
                    <li
                        key={theme.id}
                        className="bg-background flex flex-col gap-1.5 rounded-lg border p-2 text-[11px] font-medium"
                    >
                        <span className="flex h-6 overflow-hidden rounded border">
                            <span className="w-1/3" style={{ backgroundColor: theme.swatch[0] }} />
                            <span className="flex-1" style={{ backgroundColor: theme.swatch[1] }} />
                        </span>
                        {theme.id}
                    </li>
                ))}
            </ul>
            <ul className="flex flex-wrap content-start gap-1.5">
                {LANGUAGES.map((language) => (
                    <li
                        key={language.code}
                        lang={language.code}
                        dir="auto"
                        className="bg-background rounded-full border px-2.5 py-1 text-xs"
                    >
                        {language.label}
                    </li>
                ))}
            </ul>
        </div>
    )
}

function MiniPos() {
    const items = ['Oud', 'Amber', 'Rose', 'Musk', 'Cedar', 'Iris']

    return (
        <MiniPanel className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2">
            <ul className="grid grid-cols-3 gap-1.5">
                {items.map((item, index) => (
                    <li
                        key={item}
                        className={cn(
                            'flex aspect-square items-end rounded-md border p-1 text-[10px] font-medium',
                            index === 0 ? 'bg-brand-cream dark:bg-accent' : 'bg-muted/50',
                        )}
                    >
                        {item}
                    </li>
                ))}
            </ul>
            <div className="flex flex-col gap-1 rounded-md border p-1.5 text-[10px]">
                <span className="font-semibold">Cart</span>
                <span className="text-muted-foreground">Oud × 2</span>
                <span className="text-muted-foreground">Musk × 1</span>
                <span className="bg-primary text-primary-foreground mt-auto rounded px-1.5 py-1 text-center font-semibold">
                    Charge
                </span>
            </div>
        </MiniPanel>
    )
}

function MiniCode({ code, language }: { code: string; language: string }) {
    return (
        <CodeWindow
            title={language === 'bash' ? 'Terminal' : language === 'php' ? 'Pest' : 'Your page'}
            language={language}
            code={code}
            className="shadow-none"
            codeClassName="p-3 text-[11.5px] sm:text-[11.5px]"
        />
    )
}

// ---------------------------------------------------------------- By the numbers

function Numbers() {
    return (
        <section
            aria-labelledby="numbers-title"
            className="bg-brand-cream dark:bg-card relative isolate overflow-hidden border-y"
        >
            <GridLines />
            <div className="mx-auto max-w-screen-xl px-4 py-16 sm:py-20">
                <SectionHeading
                    id="numbers-title"
                    eyebrow="By the numbers"
                    title="Counted from the source, not estimated"
                    align="center"
                />
                <dl className="mt-12 grid grid-cols-2 border-s border-t sm:grid-cols-3 lg:grid-cols-6">
                    {NUMBERS.map((item) => (
                        <div
                            key={item.label}
                            className="bg-background/60 dark:bg-background/40 flex flex-col gap-1 border-e border-b p-5 text-center"
                        >
                            <dt className="order-2 text-sm font-semibold">{item.label}</dt>
                            <dd className="font-heading text-brand-navy order-1 text-4xl font-bold tracking-tight sm:text-5xl dark:text-white">
                                {item.value}
                            </dd>
                            <dd className="text-muted-foreground order-3 text-xs">{item.detail}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    )
}

// ---------------------------------------------------------------- Renderer showcase

function Showcase() {
    const { active, setActive, tabs, onKeyDown } = useTabs(RENDERERS.length)
    const renderer = RENDERERS[active]

    return (
        <section aria-labelledby="showcase-title" className="py-20 sm:py-28">
            <div className="mx-auto max-w-screen-xl px-4">
                <SectionHeading
                    id="showcase-title"
                    eyebrow="Live demo"
                    title="The same panel in React, Vue and Svelte"
                    align="center"
                >
                    The demo runs one PHP configuration in three panels. Switch the renderer to see
                    the products table each one draws.
                </SectionHeading>

                <div
                    role="tablist"
                    aria-label="Renderer"
                    onKeyDown={onKeyDown}
                    className="bg-muted mx-auto mt-10 flex w-fit gap-1 rounded-full border p-1"
                >
                    {RENDERERS.map((item, index) => {
                        const Icon = LOGOS[item.id]
                        return (
                            <button
                                key={item.id}
                                ref={(element) => {
                                    tabs.current[index] = element
                                }}
                                type="button"
                                role="tab"
                                id={`renderer-tab-${item.id}`}
                                aria-selected={index === active}
                                aria-controls="renderer-panel"
                                tabIndex={index === active ? 0 : -1}
                                onClick={() => setActive(index)}
                                className={cn(
                                    'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
                                    index === active
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <Icon className="size-4" />
                                {item.label}
                            </button>
                        )
                    })}
                </div>

                <div
                    id="renderer-panel"
                    role="tabpanel"
                    aria-labelledby={`renderer-tab-${renderer.id}`}
                    className="mx-auto mt-10 max-w-5xl"
                >
                    <Screenshot
                        key={renderer.id}
                        name={renderer.shot}
                        alt={`The demo's products table rendered by @alfakit/${renderer.id} with ${renderer.kit} components.`}
                    />
                    <p className="text-muted-foreground mt-3 text-center text-sm">
                        Rendered by <code className="font-mono">@alfakit/{renderer.id}</code> with{' '}
                        {renderer.kit}.{' '}
                        <Link href="/demo" className="text-primary font-semibold">
                            About the demo
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    )
}

// ---------------------------------------------------------------- Performance

function Performance() {
    return (
        <section
            id="performance"
            aria-labelledby="performance-title"
            className="bg-muted/30 border-y py-20 sm:py-24"
        >
            <div className="mx-auto grid max-w-screen-xl gap-12 px-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-16">
                <div className="min-w-0">
                    <SectionHeading
                        id="performance-title"
                        eyebrow="Performance"
                        title="Small responses for the things a panel does all day"
                    />
                    <ol className="mt-8 flex flex-col gap-5">
                        {[
                            {
                                title: 'The schema is sent once',
                                text: 'PHP serialises the page to JSON; the renderer keeps it in memory instead of receiving HTML on every interaction.',
                            },
                            {
                                title: 'Interactions reload one prop',
                                text: 'Sorting, searching, filtering and paging are Inertia partial reloads that return the table records as JSON.',
                            },
                            {
                                title: 'live() returns what changed',
                                text: 'A live field posts the form state; the response holds only the components whose fingerprint changed.',
                            },
                        ].map((step, index) => (
                            <li key={step.title} className="flex gap-4">
                                <span className="bg-brand-navy flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold text-white dark:bg-[#17304f]">
                                    {index + 1}
                                </span>
                                <span>
                                    <span className="block font-semibold">{step.title}</span>
                                    <span className="text-muted-foreground mt-1 block text-sm leading-6">
                                        {step.text}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ol>
                    <Link
                        href="/docs/getting-started/performance"
                        className="text-primary mt-8 inline-flex items-center gap-1.5 text-sm font-semibold"
                    >
                        Benchmarks and methodology{' '}
                        <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                    </Link>
                </div>

                <div className="flex min-w-0 flex-col gap-4">
                    <dl className="grid grid-cols-1 border-s border-t sm:grid-cols-3">
                        {HEADLINES.map((item) => (
                            <div
                                key={item.text}
                                className="bg-background flex flex-col gap-1 border-e border-b p-4"
                            >
                                <dt className="text-muted-foreground order-2 text-sm">
                                    {item.text}
                                    <span aria-hidden="true">*</span>
                                </dt>
                                <dd className="font-heading text-brand-navy order-1 text-3xl font-bold dark:text-white">
                                    {item.value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                    <div className="bg-background min-w-0 overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <caption className="text-muted-foreground px-4 pt-4 pb-2 text-start text-xs">
                                Median time to first byte and uncompressed response size*
                            </caption>
                            <thead>
                                <tr className="border-b">
                                    <th scope="col" className="px-4 py-2 text-start font-semibold">
                                        Scenario
                                    </th>
                                    <th scope="col" className="px-4 py-2 text-start font-semibold">
                                        AlfaKit
                                    </th>
                                    <th scope="col" className="px-4 py-2 text-start font-semibold">
                                        Filament v5.10
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {PERFORMANCE.map((row) => (
                                    <tr key={row.scenario} className="border-b last:border-0">
                                        <th
                                            scope="row"
                                            className="px-4 py-2.5 text-start font-normal"
                                        >
                                            {row.scenario}
                                        </th>
                                        <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                                            {row.alfakit}
                                        </td>
                                        <td className="text-muted-foreground px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                                            {row.filament}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-muted-foreground text-xs leading-5">
                        * Apple M5, 16 GB, macOS 27.0; PHP 8.4.23 with OPcache, SQLite,{' '}
                        <code className="font-mono">APP_DEBUG=false</code>; medians of 20 runs on
                        the same 10,000-row data set; Filament v5.10 with{' '}
                        <code className="font-mono">filament:optimize</code>, AlfaKit with SSR off;
                        run of 2026-10-18. Results vary with hardware, configuration, data and
                        versions; treat the ratios as indicative and run{' '}
                        <code className="font-mono">benchmarks/run.mjs</code> yourself. Filament v5
                        is itself much faster than earlier versions thanks to the{' '}
                        <a
                            href="https://laravel-news.com/help-make-filament-faster"
                            rel="noreferrer"
                            className="text-foreground underline underline-offset-4"
                        >
                            Filament team's performance work
                        </a>
                        .{' '}
                        <Link
                            href="/docs/getting-started/performance"
                            className="text-foreground underline underline-offset-4"
                        >
                            Full methodology
                        </Link>
                        .
                    </p>
                </div>
            </div>
        </section>
    )
}

// ---------------------------------------------------------------- Made by Alfa Six

function MadeByAlfaSix() {
    return (
        <section
            id="about"
            aria-labelledby="about-title"
            className="bg-brand-cream dark:bg-card border-y py-16 sm:py-20"
        >
            <div className="mx-auto grid max-w-screen-lg items-center gap-8 px-4 md:grid-cols-[auto_1fr] md:gap-14">
                <AlfaSixLockup className="[&_img]:h-14 sm:[&_img]:h-16" />
                <div>
                    <Eyebrow>About</Eyebrow>
                    <h2
                        id="about-title"
                        className="mt-3 text-3xl font-bold tracking-tight text-balance"
                    >
                        Made by Alfa Six
                    </h2>
                    <div className="text-muted-foreground mt-4 flex flex-col gap-3 text-lg text-pretty">
                        <p>
                            AlfaKit is built and maintained by Alfa Six, a digital transformation
                            company based in Bahrain. Alfa Six builds custom business software, HR
                            and ERP systems, web and mobile apps, and e-commerce stores on Shopify,
                            WooCommerce or fully custom platforms, with AI and automation where it
                            helps.
                        </p>
                        <p>
                            AlfaKit is open source under the MIT License, and the first-party
                            plugins in the directory are maintained alongside it.
                        </p>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
                        <a
                            href="https://alfasixbh.com"
                            className="text-primary inline-flex items-center gap-1.5"
                        >
                            Visit alfasixbh.com{' '}
                            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                        </a>
                        <Link
                            href="/services"
                            className="text-primary inline-flex items-center gap-1.5"
                        >
                            Services{' '}
                            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}

// ---------------------------------------------------------------- Thank you

function ThankYou() {
    return (
        <section aria-labelledby="thanks-title" className="py-20 sm:py-24">
            <div className="mx-auto max-w-3xl px-4 text-center">
                <Eyebrow>Standing on the shoulders of giants</Eyebrow>
                <h2
                    id="thanks-title"
                    className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl"
                >
                    Thank you, Filament
                </h2>
                <div className="text-muted-foreground mt-5 flex flex-col gap-4 text-lg text-pretty">
                    <p>
                        AlfaKit's PHP API is inspired by Filament. Thank you to Dan Harrin, the
                        Filament team and every contributor for years of work, and for showing the
                        Laravel community how good an admin panel builder can be.
                    </p>
                    <p>
                        If your stack is Livewire, Filament is the place to start. If it's React,
                        Vue or Svelte, we hope AlfaKit feels like home.
                    </p>
                </div>
                <a
                    href="https://filamentphp.com"
                    rel="noreferrer"
                    className="text-primary mt-6 inline-flex items-center gap-1.5 text-sm font-semibold"
                >
                    Visit filamentphp.com{' '}
                    <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                </a>
            </div>
        </section>
    )
}
