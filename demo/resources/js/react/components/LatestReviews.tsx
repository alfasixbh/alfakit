import { stars, type LatestReviewsProps } from '@/shared/platform'
import { Icon, badgeColorClasses, cn, useFormatter } from '@alfakit/react'

/**
 * The dashboard's "Latest reviews" widget. PHP sends the reviews and every label
 * (`App\Alfakit\Widgets\LatestReviews`); this component only lays them out.
 */
export default function LatestReviews({
    heading,
    description,
    empty,
    verifiedLabel,
    reviews,
}: LatestReviewsProps) {
    const format = useFormatter()

    return (
        <section
            data-surface
            className="bg-card text-card-foreground flex h-full flex-col gap-4 rounded-xl border py-4 shadow-sm"
        >
            <header className="px-5">
                <h3 className="text-base leading-none font-semibold">{heading}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm">{description}</p>
            </header>

            {reviews.length === 0 ? (
                <p className="text-muted-foreground px-5 pb-2 text-sm">{empty}</p>
            ) : (
                <ul className="divide-y px-5">
                    {reviews.map((review) => (
                        <li
                            key={review.id}
                            className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <span
                                    className="text-warning flex items-center gap-0.5"
                                    role="img"
                                    aria-label={review.ratingLabel}
                                >
                                    {stars(review.rating).map((filled, index) => (
                                        <Icon
                                            key={index}
                                            name="star"
                                            className={cn(
                                                'size-3.5',
                                                filled ? 'fill-current' : 'opacity-30',
                                            )}
                                        />
                                    ))}
                                </span>
                                <span
                                    className={cn(
                                        'rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
                                        badgeColorClasses[review.statusColor] ??
                                            badgeColorClasses.gray,
                                    )}
                                >
                                    {review.statusLabel}
                                </span>
                            </div>
                            {review.title && <p className="text-sm font-medium">{review.title}</p>}
                            {review.body && (
                                <p className="text-muted-foreground line-clamp-2 text-sm">
                                    {review.body}
                                </p>
                            )}
                            <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                                <span className="text-foreground font-medium">
                                    {review.customer}
                                </span>
                                {review.product && <span>· {review.product}</span>}
                                {review.createdAt && (
                                    <span>· {format.relative(review.createdAt)}</span>
                                )}
                                {review.verified && (
                                    <span className="text-success inline-flex items-center gap-1">
                                        <Icon name="badge-check" className="size-3.5" />
                                        {verifiedLabel}
                                    </span>
                                )}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
