import { cn } from '@/lib/utils'
import { ALFA_SIX_URL } from './site-header'

/** The Alfa Six emblem path (brand kit v3, no dots), on the micro emblem's 608 x 453 artboard. */
const EMBLEM_PATH =
    'M402 0 H460 L358 105 C429 101 478 145 478 208 C478 274 431 321 377 323 C357 325 343 322 335 314 C328 306 323 294 316 281 L259 174 C244 145 226 110 204 94 C185 80 162 75 140 78 C118 80 99 89 83 103 C59 122 46 148 44 176 C40 211 56 246 90 265 C126 286 171 283 205 257 C225 240 245 217 260 196 L284 239 C265 259 244 283 223 298 C180 329 113 331 65 305 C24 282 2 239 0 199 C-2 155 17 116 47 85 C87 43 132 25 174 34 C233 45 268 85 294 135 L371 277 C409 272 433 245 431 214 C430 177 405 149 369 150 C351 149 338 155 325 166 L294 111 L381 12 C387 4 392 0 402 0 Z'

/**
 * The Alfa Six emblem, decorative: Alfa Navy on light surfaces and white in dark mode,
 * as the brand guide asks. Pair it with the name "Alfa Six" in text.
 */
export function AlfaSixEmblem({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 608 453"
            aria-hidden="true"
            focusable="false"
            className={cn('text-brand-navy h-[1.1em] w-auto shrink-0 dark:text-white', className)}
        >
            <path transform="translate(64 64)" fill="currentColor" d={EMBLEM_PATH} />
        </svg>
    )
}

/**
 * The supplied compact lockup (emblem and ALFA SIX wordmark, navy or white master), as a
 * link to alfasixbh.com. The artwork carries its own clear space.
 */
export function AlfaSixLockup({ className }: { className?: string }) {
    return (
        <a
            href={ALFA_SIX_URL}
            aria-label="Alfa Six"
            className={cn(
                'focus-visible:ring-ring/50 inline-flex rounded-md outline-none focus-visible:ring-[3px]',
                className,
            )}
        >
            <img
                src="/brand/alfasix/alfa-six-compact-navy.svg"
                alt=""
                width="132"
                height="40"
                className="h-10 w-auto dark:hidden"
            />
            <img
                src="/brand/alfasix/alfa-six-compact-white.svg"
                alt=""
                width="132"
                height="40"
                className="hidden h-10 w-auto dark:block"
            />
        </a>
    )
}

/** "First-party · by Alfa Six" with the emblem, for official plugins. */
export function FirstPartyLabel({ className }: { className?: string }) {
    return (
        <span
            className={cn(
                'bg-brand-cream text-brand-navy dark:bg-muted inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap dark:text-white',
                className,
            )}
        >
            <AlfaSixEmblem className="h-3.5" />
            First-party · by Alfa Six
        </span>
    )
}
