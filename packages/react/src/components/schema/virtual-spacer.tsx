/**
 * Reserves the height of table rows outside the rendered window, so the scrollbar and the
 * positions of the rendered rows stay right. Hidden from assistive technology: the
 * `aria-rowcount` on the table tells the real count.
 */
export function VirtualSpacerRow({ height, colSpan }: { height: number; colSpan: number }) {
  if (height <= 0) return null

  return (
    <tr aria-hidden="true" data-slot="virtual-spacer" style={{ height }}>
      <td colSpan={colSpan} className="border-0 p-0" />
    </tr>
  )
}
