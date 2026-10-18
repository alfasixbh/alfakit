import { highlight, highlightCodeBlocks } from '@/components/docs/highlight'
import { copyText } from '@/lib/copy'
import { cn } from '@/lib/utils'
import { Button } from '@alfakit/react'
import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/** A small mono, uppercase label above a heading or card title. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <p
            className={cn(
                'text-muted-foreground font-mono text-xs font-medium tracking-[0.12em] uppercase',
                className,
            )}
        >
            {children}
        </p>
    )
}

/** Eyebrow, heading and lead paragraph of a section. */
export function SectionHeading({
    eyebrow,
    title,
    children,
    align = 'start',
    as: Tag = 'h2',
    id,
}: {
    eyebrow?: ReactNode
    title: ReactNode
    children?: ReactNode
    align?: 'start' | 'center'
    as?: 'h1' | 'h2'
    id?: string
}) {
    return (
        <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
            {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
            <Tag
                id={id}
                className={cn(
                    'font-bold tracking-tight text-balance',
                    Tag === 'h1' ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl',
                )}
            >
                {title}
            </Tag>
            {children && (
                <div className="text-muted-foreground mt-4 text-lg text-pretty">{children}</div>
            )}
        </div>
    )
}

/** A page-top band in Warm Cream (light) for inner pages. */
export function PageHero({
    eyebrow,
    title,
    children,
    aside,
}: {
    eyebrow?: ReactNode
    title: ReactNode
    children?: ReactNode
    aside?: ReactNode
}) {
    return (
        <section className="bg-brand-cream dark:bg-card relative isolate overflow-hidden border-b">
            <GridLines />
            <div
                className={cn(
                    'relative mx-auto grid max-w-screen-xl items-center gap-10 px-4 py-14 sm:py-16',
                    aside && 'lg:grid-cols-[1.5fr_1fr]',
                )}
            >
                <SectionHeading as="h1" eyebrow={eyebrow} title={title}>
                    {children}
                </SectionHeading>
                {aside}
            </div>
        </section>
    )
}

/** Faint square grid behind a band, fading out towards the end side. */
export function GridLines({ className }: { className?: string }) {
    return (
        <div
            aria-hidden="true"
            className={cn(
                'pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(7_59_120/0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgb(7_59_120/0.07)_1px,transparent_1px)] mask-[radial-gradient(ellipse_at_top,black,transparent_75%)] bg-size-[32px_32px] dark:bg-[linear-gradient(to_right,rgb(157_185_222/0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgb(157_185_222/0.07)_1px,transparent_1px)]',
                className,
            )}
        />
    )
}

/**
 * A dark editor window with a title bar and highlighted code. The highlighting runs during
 * render (highlight.js is synchronous), so server and client output match.
 */
export function CodeWindow({
    title,
    code,
    language,
    tabs,
    className,
    codeClassName,
}: {
    title: ReactNode
    code: string
    language: string
    tabs?: ReactNode
    className?: string
    codeClassName?: string
}) {
    return (
        <figure
            className={cn(
                'code-window flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0b1a2e] shadow-[0_30px_80px_-30px_rgb(4_20_43/0.65)] ring-1 ring-black/5',
                className,
            )}
        >
            <figcaption className="flex min-h-11 items-center gap-3 border-b border-white/10 bg-[#10233b] px-4 py-2">
                <span className="flex gap-1.5" aria-hidden="true">
                    <span className="size-2.5 rounded-full bg-[#2c4d7a]" />
                    <span className="size-2.5 rounded-full bg-[#2c4d7a]" />
                    <span className="size-2.5 rounded-full bg-[#2c4d7a]" />
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-[#9db9de]">
                    {title}
                </span>
                {tabs && <span className="shrink-0">{tabs}</span>}
            </figcaption>
            <pre
                dir="ltr"
                className={cn(
                    'flex-1 overflow-x-auto p-4 text-start font-mono text-[12.5px] leading-[1.7] sm:text-[13px]',
                    codeClassName,
                )}
            >
                <code
                    className="hljs"
                    dangerouslySetInnerHTML={{ __html: highlight(code, language) }}
                />
            </pre>
        </figure>
    )
}

/** A highlighted code block (highlight.js, with a copy button). */
export function CodeBlock({
    code,
    language = 'php',
    className,
}: {
    code: string
    language?: string
    className?: string
}) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (ref.current) highlightCodeBlocks(ref.current)
    }, [code])

    return (
        <div ref={ref} className={cn('docs-prose min-w-0 text-sm [&_pre]:my-0', className)}>
            <pre>
                <code className={`language-${language}`}>{code}</code>
            </pre>
        </div>
    )
}

/** A one-line shell command with a copy button. */
export function CopyCommand({
    value,
    label,
    className,
}: {
    value: string
    label?: string
    className?: string
}) {
    const [copied, setCopied] = useState(false)

    return (
        <div
            className={cn(
                'bg-background flex min-w-0 items-center gap-2 rounded-lg border py-1.5 ps-3 pe-1.5 font-mono text-[13px] leading-5',
                className,
            )}
        >
            <span className="text-muted-foreground select-none" aria-hidden="true">
                $
            </span>
            <code className="min-w-0 flex-1 break-words">{value}</code>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={async () => {
                    if (await copyText(value)) {
                        setCopied(true)
                        window.setTimeout(() => setCopied(false), 1500)
                    }
                }}
                aria-label={copied ? 'Copied' : `Copy ${label ?? 'command'}`}
            >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
        </div>
    )
}

/** A terminal-style panel for a few commands with comments. */
export function Terminal({ lines, title = 'Terminal' }: { lines: string[]; title?: string }) {
    return (
        <figure className="overflow-hidden rounded-xl border border-[#22406a] bg-[#0b1a2e] text-[13px] text-[#f5f7fa] shadow-lg">
            <figcaption className="flex items-center gap-1.5 border-b border-[#22406a] px-3 py-2 text-xs text-[#9db9de]">
                <span className="size-2.5 rounded-full bg-[#2c4d7a]" aria-hidden="true" />
                <span className="size-2.5 rounded-full bg-[#2c4d7a]" aria-hidden="true" />
                <span className="size-2.5 rounded-full bg-[#2c4d7a]" aria-hidden="true" />
                <span className="ms-2">{title}</span>
            </figcaption>
            <pre className="overflow-x-auto p-4 leading-6">
                {lines.map((line, index) => (
                    <code
                        key={index}
                        className={cn('block', line.startsWith('#') && 'text-[#9db9de]')}
                    >
                        {line === '' ? ' ' : line.startsWith('#') ? line : `$ ${line}`}
                    </code>
                ))}
            </pre>
        </figure>
    )
}
