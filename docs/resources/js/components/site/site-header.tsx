import { cn } from '@/lib/utils'
import {
    getStoredAppearance,
    resolveAppearance,
    setAppearance,
    type Appearance,
} from '@alfakit/core'
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@alfakit/react'
import { Link, router, usePage } from '@inertiajs/react'
import { ArrowUpRight, Menu, Moon, Search, Sun, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'

export const GITHUB_URL = 'https://github.com/alfasixbh/alfakit'
export const ALFA_SIX_URL = 'https://alfasixbh.com'
export const LICENSE_URL = `${GITHUB_URL}/blob/main/LICENSE.md`
/** The current release line, shown in the header pill and the home hero. */
export const RELEASE_VERSION = '0.1'

/** The main navigation, shared by the header, the mobile menus and the docs drawer. */
export const SITE_NAV: Array<{ label: string; href: string }> = [
    { label: 'Docs', href: '/docs' },
    { label: 'Features', href: '/features' },
    { label: 'Demo', href: '/demo' },
    { label: 'Plugins', href: '/plugins' },
    { label: 'Blog', href: '/blog' },
    { label: 'Community', href: '/community' },
]

export function isCurrent(url: string, href: string): boolean {
    const path = url.split(/[?#]/)[0]

    return path === href || path.startsWith(`${href}/`)
}

/**
 * Brand lockup for compact UI: the head plus the supplied wordmark artwork. `reverse` uses
 * the white wordmark in both modes, for the navy header.
 */
export function Logo({ reverse = false }: { reverse?: boolean }) {
    return (
        <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-md"
            aria-label="AlfaKit home"
        >
            <img
                src="/brand/alfakit-head-color.svg"
                alt=""
                width="32"
                height="32"
                className="size-8"
            />
            {reverse ? (
                <img
                    src="/brand/alfakit-wordmark-reverse.svg"
                    alt=""
                    width="128"
                    height="36"
                    className="hidden h-9 w-auto min-[360px]:block"
                />
            ) : (
                <>
                    <img
                        src="/brand/alfakit-wordmark-color.svg"
                        alt=""
                        width="128"
                        height="36"
                        className="hidden h-9 w-auto min-[360px]:block dark:hidden"
                    />
                    <img
                        src="/brand/alfakit-wordmark-reverse.svg"
                        alt=""
                        width="128"
                        height="36"
                        className="hidden h-9 w-auto dark:min-[360px]:block"
                    />
                </>
            )}
        </Link>
    )
}

/** A small "Beta" pill beside the logo on the navy header, linking to the changelog. */
export function BetaPill() {
    return (
        <Link
            href="/changelog"
            title={`AlfaKit ${RELEASE_VERSION} is a public beta`}
            className="shrink-0 rounded-full border border-[#f47a22]/60 bg-[#f47a22]/15 px-2 py-0.5 text-[11px] leading-4 font-semibold tracking-wide text-[#ffd9b8] uppercase transition-colors hover:bg-[#f47a22]/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fff4e4] min-[360px]:-ms-4 sm:-ms-6"
        >
            Beta
        </Link>
    )
}

export function GitHubIcon({ className = 'size-4' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
        </svg>
    )
}

/** Classes for icon buttons and links on the navy header. */
const ON_NAVY =
    'text-white/80 hover:bg-white/10 hover:text-white focus-visible:ring-[#fff4e4] dark:hover:bg-white/10'

export function ThemeToggle({ className }: { className?: string }) {
    const [appearance, setLocalAppearance] = useState<Appearance>(() =>
        typeof window === 'undefined' ? 'system' : getStoredAppearance(),
    )
    const resolved = resolveAppearance(appearance)
    const next = resolved === 'dark' ? 'light' : 'dark'

    return (
        <Button
            variant="ghost"
            size="icon"
            className={className}
            aria-label={`Switch to ${next} mode`}
            onClick={() => {
                setLocalAppearance(next)
                setAppearance(next)
            }}
        >
            {resolved === 'dark' ? <Sun /> : <Moon />}
        </Button>
    )
}

/** Links of the main navigation as a vertical list, for the mobile menus. */
export function MobileNavLinks({ onNavigate }: { onNavigate?: () => void }) {
    const { url, props } = usePage()

    return (
        <ul className="flex flex-col gap-0.5 text-base">
            {SITE_NAV.map((item) => (
                <li key={item.href}>
                    <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={isCurrent(url, item.href) ? 'page' : undefined}
                        className="hover:bg-accent aria-[current=page]:text-primary aria-[current=page]:bg-primary/10 block rounded-md px-3 py-2 font-medium"
                    >
                        {item.label}
                    </Link>
                </li>
            ))}
            <li>
                <Link
                    href="/ai"
                    onClick={onNavigate}
                    aria-current={isCurrent(url, '/ai') ? 'page' : undefined}
                    className="hover:bg-accent aria-[current=page]:text-primary aria-[current=page]:bg-primary/10 block rounded-md px-3 py-2 font-medium"
                >
                    AI agents
                </Link>
            </li>
            <li>
                <a
                    href={GITHUB_URL}
                    className="hover:bg-accent flex items-center gap-2 rounded-md px-3 py-2 font-medium"
                >
                    GitHub{' '}
                    <ArrowUpRight
                        className="text-muted-foreground size-4 rtl:-rotate-90"
                        aria-hidden="true"
                    />
                </a>
            </li>
            <li className="mt-3 px-3">
                <Button asChild className="w-full rounded-full">
                    <a href={props.demoUrl}>Open the live demo</a>
                </Button>
            </li>
        </ul>
    )
}

/**
 * The header of every page, on Alfa Navy in both modes (the home hero continues it). On
 * docs pages `onMenu` opens the docs drawer (which also lists the main navigation);
 * elsewhere the menu button opens the site menu below the header.
 */
export function SiteHeader({ onMenu }: { onMenu?: () => void }) {
    const { url, props } = usePage()
    const [menuOpen, setMenuOpen] = useState(false)
    const menuId = useId()

    // Close the site menu on navigation.
    const [menuUrl, setMenuUrl] = useState(url)
    if (menuUrl !== url) {
        setMenuUrl(url)
        setMenuOpen(false)
    }

    return (
        <header className="on-brand bg-brand-navy sticky top-0 z-30 border-b border-white/10 text-white">
            <a
                href="#main"
                className="text-brand-navy sr-only z-50 rounded-md bg-white px-3 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:start-4 focus:top-2"
            >
                Skip to content
            </a>
            <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-2 px-4 sm:gap-4">
                <Logo reverse />
                <BetaPill />
                <nav
                    aria-label="Main"
                    className="ms-4 hidden items-center gap-0.5 text-sm lg:flex xl:ms-6"
                >
                    {SITE_NAV.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isCurrent(url, item.href) ? 'page' : undefined}
                            className="rounded-full px-3 py-1.5 font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white aria-[current=page]:bg-white/15 aria-[current=page]:text-white"
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <div className="ms-auto flex items-center gap-1">
                    <SearchButton onNavy />
                    <ThemeToggle className={ON_NAVY} />
                    <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className={`hidden sm:inline-flex ${ON_NAVY}`}
                    >
                        <a href={GITHUB_URL} aria-label="AlfaKit on GitHub">
                            <GitHubIcon className="size-5" />
                        </a>
                    </Button>
                    <a
                        href={props.demoUrl}
                        className="text-brand-navy ms-1 hidden h-8 items-center rounded-full bg-white px-4 text-sm font-semibold transition-colors hover:bg-[#fff4e4] md:inline-flex"
                    >
                        Live demo
                    </a>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`lg:hidden ${ON_NAVY}`}
                        aria-label="Menu"
                        aria-expanded={onMenu ? undefined : menuOpen}
                        aria-controls={onMenu ? undefined : menuId}
                        onClick={() => (onMenu ? onMenu() : setMenuOpen((open) => !open))}
                    >
                        {menuOpen ? <X /> : <Menu />}
                    </Button>
                </div>
            </div>
            {!onMenu && menuOpen && (
                <nav
                    id={menuId}
                    aria-label="Main"
                    className="bg-background text-foreground border-t px-4 py-4 [--ring:var(--color-brand-navy)] lg:hidden dark:[--ring:#f47a22]"
                >
                    <MobileNavLinks onNavigate={() => setMenuOpen(false)} />
                </nav>
            )}
        </header>
    )
}

interface SearchResult {
    slug: string
    title: string
    section: string
    excerpt: string
}

export function SearchButton({ onNavy = false }: { onNavy?: boolean }) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const visibleResults = query.trim() ? results : []

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault()
                setOpen(true)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    useEffect(() => {
        if (!query.trim()) {
            return
        }
        const timer = setTimeout(() => {
            void fetch(`/docs/search?q=${encodeURIComponent(query)}`, {
                headers: { Accept: 'application/json' },
            })
                .then((response) => response.json())
                .then((data: { results?: SearchResult[] }) => setResults(data.results ?? []))
        }, 200)
        return () => clearTimeout(timer)
    }, [query])

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className={cn(
                    'text-muted-foreground hidden w-44 justify-start gap-2 rounded-full font-normal xl:flex xl:w-56',
                    onNavy &&
                        'border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white dark:border-white/20 dark:bg-white/5 dark:hover:bg-white/10',
                )}
                onClick={() => setOpen(true)}
            >
                <Search className="size-4" /> Search docs…{' '}
                <kbd
                    className={cn(
                        'bg-muted ms-auto rounded px-1 font-mono text-[10px]',
                        onNavy && 'bg-white/10 text-white/80',
                    )}
                >
                    ⌘K
                </kbd>
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className={cn('xl:hidden', onNavy && ON_NAVY)}
                onClick={() => setOpen(true)}
                aria-label="Search docs"
            >
                <Search />
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="gap-0 p-0 sm:max-w-xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Search</DialogTitle>
                        <DialogDescription>Search the documentation</DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-2 border-b px-3">
                        <Search className="text-muted-foreground size-4" aria-hidden="true" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search documentation…"
                            aria-label="Search documentation"
                            className="h-12 flex-1 bg-transparent text-sm outline-none"
                        />
                    </div>
                    <ul className="max-h-80 overflow-y-auto p-2">
                        {visibleResults.map((result) => (
                            <li key={result.slug}>
                                <button
                                    type="button"
                                    className="hover:bg-accent focus-visible:bg-accent flex w-full flex-col items-start rounded-md px-3 py-2 text-start outline-none"
                                    onClick={() => {
                                        setOpen(false)
                                        router.visit(`/docs/${result.slug}`)
                                    }}
                                >
                                    <span className="text-sm font-medium">
                                        {result.title}{' '}
                                        <span className="text-muted-foreground font-normal">
                                            · {result.section}
                                        </span>
                                    </span>
                                    <span className="text-muted-foreground line-clamp-1 text-xs">
                                        {result.excerpt}
                                    </span>
                                </button>
                            </li>
                        ))}
                        {query && visibleResults.length === 0 && (
                            <li className="text-muted-foreground px-3 py-6 text-center text-sm">
                                No results.
                            </li>
                        )}
                    </ul>
                </DialogContent>
            </Dialog>
        </>
    )
}
