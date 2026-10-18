<script lang="ts">
    import { Icon, badgeColorClasses, cn, useFormatter } from '@alfakit/svelte'
    import { stars, type LatestReviewsProps } from '@/shared/platform'

    /**
     * The dashboard's "Latest reviews" widget. PHP sends the reviews and every label
     * (`App\Alfakit\Widgets\LatestReviews`); this component only lays them out.
     */
    let { heading, description, empty, verifiedLabel, reviews }: LatestReviewsProps = $props()

    const format = useFormatter()
</script>

<section
    data-surface
    class="bg-card text-card-foreground flex h-full flex-col gap-4 rounded-xl border py-4 shadow-sm"
>
    <header class="px-5">
        <h3 class="text-base leading-none font-semibold">{heading}</h3>
        <p class="text-muted-foreground mt-1.5 text-sm">{description}</p>
    </header>

    {#if reviews.length === 0}
        <p class="text-muted-foreground px-5 pb-2 text-sm">{empty}</p>
    {:else}
        <ul class="divide-y px-5">
            {#each reviews as review (review.id)}
                <li class="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                    <div class="flex items-center justify-between gap-3">
                        <span
                            class="text-warning flex items-center gap-0.5"
                            role="img"
                            aria-label={review.ratingLabel}
                        >
                            {#each stars(review.rating) as filled, index (index)}
                                <Icon
                                    name="star"
                                    class={cn('size-3.5', filled ? 'fill-current' : 'opacity-30')}
                                />
                            {/each}
                        </span>
                        <span
                            class={cn(
                                'rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
                                badgeColorClasses[review.statusColor] ?? badgeColorClasses.gray,
                            )}
                        >
                            {review.statusLabel}
                        </span>
                    </div>
                    {#if review.title}
                        <p class="text-sm font-medium">{review.title}</p>
                    {/if}
                    {#if review.body}
                        <p class="text-muted-foreground line-clamp-2 text-sm">{review.body}</p>
                    {/if}
                    <p class="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                        <span class="text-foreground font-medium">{review.customer}</span>
                        {#if review.product}
                            <span>· {review.product}</span>
                        {/if}
                        {#if review.createdAt}
                            <span>· {format.current.relative(review.createdAt)}</span>
                        {/if}
                        {#if review.verified}
                            <span class="text-success inline-flex items-center gap-1">
                                <Icon name="badge-check" class="size-3.5" />
                                {verifiedLabel}
                            </span>
                        {/if}
                    </p>
                </li>
            {/each}
        </ul>
    {/if}
</section>
