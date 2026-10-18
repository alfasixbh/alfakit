import { cn } from '@/lib/utils'

/**
 * A screenshot from public/screenshots (e2e/showcase/screenshots.mjs), shown in a browser
 * frame. The light image shows in light mode and the dark one in dark mode; lazy images
 * that are hidden are not downloaded, so a visitor loads one of the two.
 */
export function Screenshot({
    name,
    alt,
    priority = false,
    dark = true,
    mobile = false,
    frame = true,
    className,
}: {
    /** File name without the -light/-dark suffix and extension. */
    name: string
    alt: string
    priority?: boolean
    /** False for images captured in light mode only (the theme variants). */
    dark?: boolean
    mobile?: boolean
    frame?: boolean
    className?: string
}) {
    const [width, height] = mobile ? [390, 844] : [1440, 900]
    const common = {
        width,
        height,
        alt,
        loading: priority ? ('eager' as const) : ('lazy' as const),
        decoding: 'async' as const,
        className: 'block h-auto w-full',
    }

    const images = (
        <>
            <img
                {...common}
                src={`/screenshots/${name}-light.webp`}
                className={cn(common.className, dark && 'dark:hidden')}
                fetchPriority={priority ? 'high' : undefined}
            />
            {dark && (
                <img
                    {...common}
                    src={`/screenshots/${name}-dark.webp`}
                    className={cn(common.className, 'hidden dark:block')}
                />
            )}
        </>
    )

    if (!frame) {
        return <div className={cn('overflow-hidden rounded-xl border', className)}>{images}</div>
    }

    return (
        <figure
            className={cn(
                'bg-card overflow-hidden border shadow-[0_24px_60px_-28px_rgb(7_59_120_/_0.45)] dark:shadow-[0_24px_60px_-28px_rgb(0_0_0_/_0.8)]',
                mobile
                    ? 'rounded-[2rem] border-[6px] border-[#14263d] dark:border-[#22406a]'
                    : 'rounded-xl',
                className,
            )}
        >
            {!mobile && (
                <div
                    className="bg-muted/70 flex h-7 items-center gap-1.5 border-b px-3"
                    aria-hidden="true"
                >
                    <span className="size-2.5 rounded-full bg-[#e4dccf] dark:bg-[#2c4d7a]" />
                    <span className="size-2.5 rounded-full bg-[#e4dccf] dark:bg-[#2c4d7a]" />
                    <span className="size-2.5 rounded-full bg-[#e4dccf] dark:bg-[#2c4d7a]" />
                </div>
            )}
            {images}
        </figure>
    )
}
