import { scentRows, type ScentPyramidProps } from '@/shared/catalog'
import { cn } from '@alfakit/react'

/**
 * The scent pyramid on the product view page: top, heart and base notes drawn as three tiers
 * of growing width. PHP sends the notes and the translated tier labels.
 */
export default function ScentPyramid({ state, labels }: ScentPyramidProps) {
    const rows = scentRows(state)

    if (rows.length === 0) {
        return <p className="text-muted-foreground text-sm">{labels.empty}</p>
    }

    return (
        <ol data-slot="scent-pyramid" className="flex flex-col items-center gap-1.5">
            {rows.map((row) => (
                <li
                    key={row.level}
                    className={cn(
                        'bg-muted/60 flex min-w-48 flex-col gap-1 rounded-lg border px-3 py-2 text-center',
                        row.width,
                    )}
                >
                    <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                        {labels[row.level]}
                    </span>
                    <span className="text-sm capitalize">{row.notes.join(' · ')}</span>
                </li>
            ))}
        </ol>
    )
}
