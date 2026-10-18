/** Props of the `ScentPyramid` infolist entry (`ProductResource::infolist()`, a `ViewEntry`). */
export interface ScentPyramidProps {
    /** The product's `scent_notes` JSON: notes per level, any level may be missing. */
    state: Partial<Record<ScentLevel, string[]>> | null
    labels: Record<ScentLevel | 'empty', string>
}

export type ScentLevel = 'top' | 'heart' | 'base'

/** Levels from the most volatile down, with the width of their pyramid tier. */
export const scentTiers: ReadonlyArray<{ level: ScentLevel; width: string }> = [
    { level: 'top', width: 'w-3/5' },
    { level: 'heart', width: 'w-4/5' },
    { level: 'base', width: 'w-full' },
]

/** The tiers that actually carry notes, in pyramid order. */
export function scentRows(
    state: ScentPyramidProps['state'],
): Array<{ level: ScentLevel; width: string; notes: string[] }> {
    return scentTiers
        .map((tier) => ({ ...tier, notes: state?.[tier.level] ?? [] }))
        .filter((tier) => tier.notes.length > 0)
}
