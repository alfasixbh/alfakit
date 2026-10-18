/**
 * Props of the platform area's custom widgets, serialised by PHP (`getViewData()`). The
 * three renderers share these types so the components stay identical.
 */
export interface LatestReview {
    id: number
    rating: number
    ratingLabel: string
    title: string | null
    body: string | null
    product: string | null
    customer: string | null
    status: string
    statusLabel: string
    statusColor: string
    verified: boolean
    createdAt: string | null
}

export interface LatestReviewsProps {
    heading: string
    description: string
    empty: string
    verifiedLabel: string
    reviews: LatestReview[]
}

/** Five slots, filled up to the rating. */
export function stars(rating: number): boolean[] {
    return [1, 2, 3, 4, 5].map((step) => step <= rating)
}
