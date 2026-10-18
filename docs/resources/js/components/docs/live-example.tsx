import { CodeWindow } from '@/components/site/ui'
import { cn } from '@/lib/utils'
import { Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export interface LiveExampleData {
    name: string
    title: string
    code: string
    /** The iframe URL of the example in each renderer. */
    frames: Record<string, string>
}

const RENDERER_LABELS: Record<string, string> = { react: 'React', vue: 'Vue', svelte: 'Svelte' }

/** The site's theme (the `dark` class on <html>), kept in sync. */
function useTheme(): 'light' | 'dark' {
    const [theme, setTheme] = useState<'light' | 'dark'>('light')

    useEffect(() => {
        const root = document.documentElement
        const update = () => setTheme(root.classList.contains('dark') ? 'dark' : 'light')
        update()
        const observer = new MutationObserver(update)
        observer.observe(root, { attributes: true, attributeFilter: ['class'] })

        return () => observer.disconnect()
    }, [])

    return theme
}

/**
 * A live example of the docs (```alfakit-example name="…"``` in the Markdown): the PHP class
 * from docs/app/Examples, and what it renders in React, Vue and Svelte. Each renderer runs
 * in an iframe served by the docs app, loaded when the example scrolls into view and the
 * tab is first opened; validation, actions and notifications run on the server for real.
 */
export function LiveExample({ example }: { example: LiveExampleData }) {
    const renderers = Object.keys(example.frames)
    const [renderer, setRenderer] = useState(renderers[0] ?? 'react')
    const [opened, setOpened] = useState<string[]>([])
    const [visible, setVisible] = useState(false)
    const [heights, setHeights] = useState<Record<string, number>>({})
    const theme = useTheme()
    const box = useRef<HTMLDivElement>(null)
    const rendererRef = useRef(renderer)
    const open = (key: string) => setOpened((list) => (list.includes(key) ? list : [...list, key]))
    const select = (key: string) => {
        rendererRef.current = key
        setRenderer(key)
        if (visible) open(key)
    }

    useEffect(() => {
        const element = box.current
        if (!element) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setVisible(true)
                    open(rendererRef.current)
                    observer.disconnect()
                }
            },
            { rootMargin: '300px' },
        )
        observer.observe(element)

        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return
            const data = event.data as { alfakitExample?: string; height?: number } | null
            if (!data?.alfakitExample || typeof data.height !== 'number') return

            for (const [key, url] of Object.entries(example.frames)) {
                if (data.alfakitExample === new URL(url, window.location.origin).pathname) {
                    const height = Math.min(Math.max(data.height, 120), 1400)
                    setHeights((current) =>
                        current[key] === height ? current : { ...current, [key]: height },
                    )
                }
            }
        }
        window.addEventListener('message', onMessage)

        return () => window.removeEventListener('message', onMessage)
    }, [example.frames])

    return (
        <div
            ref={box}
            className="not-prose bg-card my-6 overflow-hidden rounded-xl border"
            data-live-example={example.name}
        >
            <div className="bg-muted/60 flex flex-wrap items-center gap-3 border-b px-3 py-2">
                <span className="text-muted-foreground inline-flex items-center gap-1.5 font-mono text-xs tracking-wide uppercase">
                    <Play className="size-3.5" aria-hidden="true" /> Live example
                </span>
                <div
                    role="tablist"
                    aria-label="Renderer of the example"
                    className="bg-background ms-auto inline-flex rounded-md border p-0.5"
                >
                    {renderers.map((key) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={key === renderer}
                            onClick={() => select(key)}
                            className={cn(
                                'focus-visible:ring-ring/50 rounded px-2.5 py-0.5 text-xs font-medium outline-none focus-visible:ring-[3px]',
                                key === renderer
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {RENDERER_LABELS[key] ?? key}
                        </button>
                    ))}
                </div>
            </div>
            <div className="bg-background relative">
                {renderers.map((key) =>
                    opened.includes(key) ? (
                        <iframe
                            key={`${key}-${theme}`}
                            src={`${example.frames[key]}?theme=${theme}`}
                            title={`${example.title} rendered by ${RENDERER_LABELS[key] ?? key}`}
                            loading="lazy"
                            className={cn('block w-full border-0', key !== renderer && 'hidden')}
                            style={{ height: heights[key] ?? 320 }}
                        />
                    ) : null,
                )}
                {!opened.includes(renderer) && <div className="h-80" aria-hidden="true" />}
            </div>
            <CodeWindow
                title={example.title}
                code={example.code}
                language="php"
                className="rounded-none border-0 border-t shadow-none ring-0"
                codeClassName="max-h-96"
            />
        </div>
    )
}
