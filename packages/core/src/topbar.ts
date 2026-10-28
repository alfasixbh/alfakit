/**
 * Classes for the `topbar.end` slot box in every renderer's top bar (sidebar, top
 * navigation and fullscreen layouts). Items apps add there get a box of their own that
 * shrinks, and clips, before the bar's buttons do, so they can't push the bar wider than
 * the screen. The negative margin with matching padding keeps their focus rings visible.
 */
export const TOPBAR_END_SLOT_CLASS = '-m-1 flex min-w-0 items-center gap-1 overflow-hidden p-1'
