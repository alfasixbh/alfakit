export interface PostSummary {
    slug: string
    title: string
    description: string
    /** Y-m-d */
    date: string
    author: string
    cover: string | null
    coverAlt: string
    readingMinutes: number
}

export interface Post extends PostSummary {
    html: string
    toc: Array<{ id: string; text: string; level: number }>
}

/** A post date (Y-m-d) as "12 October 2026", independent of the visitor's timezone. */
export function formatDate(date: string): string {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(
        new Date(`${date}T00:00:00Z`),
    )
}
