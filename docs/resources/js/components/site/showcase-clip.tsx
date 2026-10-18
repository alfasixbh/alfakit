import { cn } from '@/lib/utils'
import { Film, Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export type Clip = { video: string; poster: string | null }

const RENDERER_LABELS: Record<string, string> = { react: 'React', vue: 'Vue', svelte: 'Svelte' }

/** Whether the site is in dark mode (the `dark` class on <html>), kept in sync. */
function useDarkMode(): boolean {
    const [dark, setDark] = useState(false)

    useEffect(() => {
        const root = document.documentElement
        const update = () => setDark(root.classList.contains('dark'))
        update()
        const observer = new MutationObserver(update)
        observer.observe(root, { attributes: true, attributeFilter: ['class'] })

        return () => observer.disconnect()
    }, [])

    return dark
}

function useReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false)

    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)')
        const update = () => setReduced(query.matches)
        update()
        query.addEventListener('change', update)

        return () => query.removeEventListener('change', update)
    }, [])

    return reduced
}

/** The clip of a renderer in the site's theme, else the other theme, else React's. */
function pickClip(clips: Record<string, Clip>, renderer: string, dark: boolean): Clip | null {
    const theme = dark ? 'dark' : 'light'
    const other = dark ? 'light' : 'dark'

    return (
        clips[`${renderer}-${theme}`] ??
        clips[`${renderer}-${other}`] ??
        clips[`react-${theme}`] ??
        clips[`react-${other}`] ??
        null
    )
}

/**
 * The hero clip of a plugin page: recorded tours (docs/public/showcase/<slug>) with
 * React, Vue and Svelte tabs. Videos load only when scrolled into view, are muted and loop,
 * start from a poster, and stay paused (with a play button) for reduced motion.
 */
export function ShowcaseClip({
    clips,
    renderers,
    title,
    className,
}: {
    clips: Record<string, Clip>
    renderers: string[]
    title: string
    className?: string
}) {
    const available = renderers.filter((renderer) =>
        Object.keys(clips).some((key) => key.startsWith(`${renderer}-`)),
    )
    const [renderer, setRenderer] = useState(available[0] ?? 'react')
    const dark = useDarkMode()
    const reducedMotion = useReducedMotion()
    const [visible, setVisible] = useState(false)
    const [playing, setPlaying] = useState(false)
    const frame = useRef<HTMLDivElement>(null)
    const video = useRef<HTMLVideoElement>(null)
    const clip = pickClip(clips, renderer, dark)

    useEffect(() => {
        const element = frame.current
        if (!element || visible) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setVisible(true)
                    observer.disconnect()
                }
            },
            { rootMargin: '200px' },
        )
        observer.observe(element)

        return () => observer.disconnect()
    }, [visible])

    // Autoplay once visible, unless the visitor prefers reduced motion; `playing` follows
    // the video's own play and pause events.
    useEffect(() => {
        const element = video.current
        if (!element || !visible) return

        if (reducedMotion) {
            element.pause()
        } else {
            void element.play().catch(() => {})
        }
    }, [visible, reducedMotion, clip?.video])

    const toggle = () => {
        const element = video.current
        if (!element) return

        if (element.paused) {
            void element.play().catch(() => {})
        } else {
            element.pause()
        }
    }

    return (
        <div className={cn('flex min-w-0 flex-col gap-3', className)}>
            <figure
                ref={frame}
                className="bg-card relative overflow-hidden rounded-xl border shadow-[0_24px_60px_-28px_rgb(7_59_120_/_0.45)] dark:shadow-[0_24px_60px_-28px_rgb(0_0_0_/_0.8)]"
            >
                <div
                    className="bg-muted/70 flex h-7 items-center gap-1.5 border-b px-3"
                    aria-hidden="true"
                >
                    <span className="size-2.5 rounded-full bg-[#e4dccf] dark:bg-[#2c4d7a]" />
                    <span className="size-2.5 rounded-full bg-[#e4dccf] dark:bg-[#2c4d7a]" />
                    <span className="size-2.5 rounded-full bg-[#e4dccf] dark:bg-[#2c4d7a]" />
                </div>
                <div className="relative aspect-video">
                    {clip ? (
                        <video
                            key={clip.video}
                            ref={video}
                            className="absolute inset-0 size-full object-cover object-top"
                            src={visible ? clip.video : undefined}
                            poster={clip.poster ?? undefined}
                            muted
                            loop
                            playsInline
                            preload="none"
                            onPlay={() => setPlaying(true)}
                            onPause={() => setPlaying(false)}
                            aria-label={`${title} in the ${RENDERER_LABELS[renderer] ?? renderer} panel`}
                        />
                    ) : (
                        <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm">
                            <Film className="size-8" aria-hidden="true" />
                            The clip of this plugin is being recorded.
                        </div>
                    )}
                    {clip && (
                        <button
                            type="button"
                            onClick={toggle}
                            className="bg-background/90 hover:bg-background focus-visible:ring-ring/50 absolute end-3 bottom-3 inline-flex size-9 items-center justify-center rounded-full border shadow-sm outline-none focus-visible:ring-[3px]"
                            aria-label={playing ? 'Pause the clip' : 'Play the clip'}
                        >
                            {playing ? (
                                <Pause className="size-4" aria-hidden="true" />
                            ) : (
                                <Play className="size-4" aria-hidden="true" />
                            )}
                        </button>
                    )}
                </div>
            </figure>
            {available.length > 1 && (
                <div
                    role="tablist"
                    aria-label="Renderer of the clip"
                    className="bg-muted inline-flex self-start rounded-lg p-1"
                >
                    {available.map((key) => (
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
            )}
        </div>
    )
}
