import type { MenuItemSchema } from '@alfakit/core'
import { groupMenuItems, menuActionContext } from '@alfakit/core'
import { Link, router } from '@inertiajs/react'
import { Fragment } from 'react'
import { useActionRunner, usePageSchema } from '../../context'
import { colorClass, textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { NewTabHint } from '../../lib/new-tab-hint'
import { cn } from '../../lib/utils'
import { DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu'

export type MenuName = 'userMenu' | 'tenantMenu'

/**
 * An entry in the user or tenant menu: colour, icon, new tab and POST links, or an
 * `Action` (server logic, modals) run through the action endpoint as a menu action.
 */
export function MenuItemEntry({
  item,
  menu = 'userMenu',
}: {
  item: MenuItemSchema
  menu?: MenuName
}) {
  const runner = useActionRunner()
  const page = usePageSchema()
  // Unknown values get no class (custom names get theirs).
  const color = item.color ? colorClass(textColorClasses, item.color, item.color) : undefined

  const content = (
    <>
      {item.icon && <Icon name={item.icon} className={cn(color)} />}
      <span className={cn(color)}>{item.label}</span>
    </>
  )

  if (item.action) {
    const action = item.action

    return (
      <DropdownMenuItem
        disabled={action.disabled}
        title={action.tooltip}
        onSelect={() => void runner.trigger(action, menuActionContext(page?.token ?? '', menu))}
      >
        {content}
      </DropdownMenuItem>
    )
  }

  if (item.method === 'post') {
    return (
      <DropdownMenuItem onSelect={() => item.url && router.post(item.url)}>
        {content}
      </DropdownMenuItem>
    )
  }

  return (
    <DropdownMenuItem asChild>
      {item.openInNewTab ? (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="w-full">
          {content}
          <NewTabHint />
        </a>
      ) : (
        <Link href={item.url ?? '#'} className="w-full">
          {content}
        </Link>
      )}
    </DropdownMenuItem>
  )
}

/** Menu entries with a separator between their groups. */
export function MenuItemEntries({ items, menu }: { items: MenuItemSchema[]; menu?: MenuName }) {
  return (
    <>
      {groupMenuItems(items).map((group, groupIndex) => (
        <Fragment key={groupIndex}>
          {groupIndex > 0 && <DropdownMenuSeparator />}
          {group.map((item, index) => (
            <MenuItemEntry key={index} item={item} menu={menu} />
          ))}
        </Fragment>
      ))}
    </>
  )
}
