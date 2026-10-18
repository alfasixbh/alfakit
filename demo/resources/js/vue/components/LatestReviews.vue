<script setup lang="ts">
import { Icon, badgeColorClasses, cn, useFormatter } from '@alfakit/vue'
import { stars, type LatestReviewsProps } from '@/shared/platform'

/**
 * The dashboard's "Latest reviews" widget. PHP sends the reviews and every label
 * (`App\Alfakit\Widgets\LatestReviews`); this component only lays them out.
 */
defineProps<LatestReviewsProps>()

const format = useFormatter()
</script>

<template>
    <section
        data-surface
        class="bg-card text-card-foreground flex h-full flex-col gap-4 rounded-xl border py-4 shadow-sm"
    >
        <header class="px-5">
            <h3 class="text-base leading-none font-semibold">{{ heading }}</h3>
            <p class="text-muted-foreground mt-1.5 text-sm">{{ description }}</p>
        </header>

        <p v-if="reviews.length === 0" class="text-muted-foreground px-5 pb-2 text-sm">
            {{ empty }}
        </p>
        <ul v-else class="divide-y px-5">
            <li
                v-for="review in reviews"
                :key="review.id"
                class="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0"
            >
                <div class="flex items-center justify-between gap-3">
                    <span
                        class="text-warning flex items-center gap-0.5"
                        role="img"
                        :aria-label="review.ratingLabel"
                    >
                        <Icon
                            v-for="(filled, index) in stars(review.rating)"
                            :key="index"
                            name="star"
                            :class="cn('size-3.5', filled ? 'fill-current' : 'opacity-30')"
                        />
                    </span>
                    <span
                        :class="
                            cn(
                                'rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
                                badgeColorClasses[review.statusColor] ?? badgeColorClasses.gray,
                            )
                        "
                    >
                        {{ review.statusLabel }}
                    </span>
                </div>
                <p v-if="review.title" class="text-sm font-medium">{{ review.title }}</p>
                <p v-if="review.body" class="text-muted-foreground line-clamp-2 text-sm">
                    {{ review.body }}
                </p>
                <p class="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                    <span class="text-foreground font-medium">{{ review.customer }}</span>
                    <span v-if="review.product">· {{ review.product }}</span>
                    <span v-if="review.createdAt">· {{ format.relative(review.createdAt) }}</span>
                    <span
                        v-if="review.verified"
                        class="text-success inline-flex items-center gap-1"
                    >
                        <Icon name="badge-check" class="size-3.5" />
                        {{ verifiedLabel }}
                    </span>
                </p>
            </li>
        </ul>
    </section>
</template>
