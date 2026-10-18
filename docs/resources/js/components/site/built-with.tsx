import { cn } from '@/lib/utils'
import { Link } from '@inertiajs/react'

/** A small "Built with AlfaKit <plugin>" note that links to the plugin's page. */
export function BuiltWith({
    plugin,
    slug,
    className,
}: {
    plugin: string
    slug: string
    className?: string
}) {
    return (
        <p className={cn('text-muted-foreground text-xs', className)}>
            Built with{' '}
            <Link
                href={`/plugins/${slug}`}
                className="text-foreground font-medium underline-offset-4 hover:underline"
            >
                AlfaKit {plugin}
            </Link>
        </p>
    )
}
