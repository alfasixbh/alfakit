import {
  cmsLinkRel,
  type CmsMenuItemSchema,
  type CmsMenuSchema,
  type CmsSiteSchema,
} from '@alfakit/core'
import { ChevronDownIcon, MenuIcon, XIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { useCms } from './context'

function ItemLink({ item, className }: { item: CmsMenuItemSchema; className?: string }) {
  const { t } = useCms()

  if (!item.url) {
    return <span className={className}>{item.label}</span>
  }

  return (
    <a
      href={item.url}
      target={item.newTab ? '_blank' : undefined}
      rel={cmsLinkRel(item.newTab)}
      aria-current={item.current ? 'page' : undefined}
      data-active={item.active || undefined}
      className={className}
    >
      {item.label}
      {item.newTab && (
        <span className="sr-only"> {t('cms.new_tab', {}, '(opens in a new tab)')}</span>
      )}
    </a>
  )
}

const linkClass =
  'hover:text-foreground focus-visible:ring-ring/50 rounded-md px-3 py-2 text-sm font-medium outline-none focus-visible:ring-[3px] data-[active]:text-foreground text-muted-foreground aria-[current=page]:text-foreground'

/** A top-level item with a submenu: the link plus a disclosure button for its children. */
function DropdownItem({ item }: { item: CmsMenuItemSchema }) {
  const { t } = useCms()
  const [open, setOpen] = useState(false)
  const id = useId()
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (!open) return

    const close = (event: MouseEvent | FocusEvent) => {
      if (ref.current && event.target instanceof Node && !ref.current.contains(event.target))
        setOpen(false)
    }

    document.addEventListener('mousedown', close)
    document.addEventListener('focusin', close)

    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('focusin', close)
    }
  }, [open])

  return (
    <li
      ref={ref}
      className="relative flex items-center"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          setOpen(false)
          ref.current?.querySelector<HTMLButtonElement>('button')?.focus()
        }
      }}
    >
      <ItemLink item={item} className={linkClass} />
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -ms-2 rounded-md p-1.5 outline-none focus-visible:ring-[3px]"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <ChevronDownIcon
          className={cn('size-4 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
        <span className="sr-only">
          {t('cms.toggle_submenu', { label: item.label }, `Show the ${item.label} submenu`)}
        </span>
      </button>
      <ul
        id={id}
        hidden={!open}
        className="bg-popover text-popover-foreground absolute start-0 top-full z-40 mt-1 min-w-52 rounded-lg border p-1 shadow-md"
      >
        {item.children.map((child) => (
          <li key={child.id}>
            <ItemLink item={child} className={cn(linkClass, 'block')} />
            {child.children.length > 0 && (
              <ul className="ms-3 border-s ps-1">
                {child.children.map((grandchild) => (
                  <li key={grandchild.id}>
                    <ItemLink item={grandchild} className={cn(linkClass, 'block')} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </li>
  )
}

/** Nested items as plain lists (the mobile menu and the footer). */
export function CmsMenuList({
  items,
  className,
  itemClassName,
}: {
  items: CmsMenuItemSchema[]
  className?: string
  itemClassName?: string
}) {
  return (
    <ul className={className}>
      {items.map((item) => (
        <li key={item.id}>
          <ItemLink item={item} className={cn(linkClass, 'block', itemClassName)} />
          {item.children.length > 0 && (
            <CmsMenuList
              items={item.children}
              className="ms-3 border-s ps-2"
              itemClassName={itemClassName}
            />
          )}
        </li>
      ))}
    </ul>
  )
}

/** Links to the page in the site's other languages. */
export function CmsLanguageSwitcher({
  site,
  className,
}: {
  site: CmsSiteSchema
  className?: string
}) {
  const { t } = useCms()

  if (site.locales.length < 2) return null

  return (
    <nav
      aria-label={t('cms.language', {}, 'Language')}
      className={className}
      data-slot="cms-language-switcher"
    >
      <ul className="flex flex-wrap items-center gap-1">
        {site.locales.map((locale) => (
          <li key={locale.code}>
            <a
              href={locale.url}
              hrefLang={locale.code}
              lang={locale.code}
              aria-current={locale.current ? 'true' : undefined}
              className={cn(linkClass, 'px-2 py-1 uppercase')}
            >
              {locale.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * The header navigation: items in a row from `md`, a disclosure menu below it. Items
 * with children get a submenu button (Escape or a click outside closes it).
 */
export function CmsNav({
  menu,
  children,
}: {
  menu: CmsMenuSchema | null | undefined
  children?: ReactNode
}) {
  const { t } = useCms()
  const [open, setOpen] = useState(false)
  const id = useId()

  if (!menu || menu.items.length === 0) return <>{children}</>

  return (
    <>
      <nav
        aria-label={t('cms.main_navigation', {}, 'Main navigation')}
        className="hidden md:block"
        data-slot="cms-nav"
      >
        <ul className="flex items-center gap-1">
          {menu.items.map((item) =>
            item.children.length > 0 ? (
              <DropdownItem key={item.id} item={item} />
            ) : (
              <li key={item.id}>
                <ItemLink item={item} className={linkClass} />
              </li>
            ),
          )}
        </ul>
      </nav>
      {children}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {open ? <XIcon aria-hidden="true" /> : <MenuIcon aria-hidden="true" />}
        <span className="sr-only">
          {open ? t('cms.close_menu', {}, 'Close menu') : t('cms.open_menu', {}, 'Open menu')}
        </span>
      </Button>
      <nav
        id={id}
        hidden={!open}
        aria-label={t('cms.main_navigation', {}, 'Main navigation')}
        className="bg-background absolute inset-x-0 top-full z-40 border-b px-4 pb-4 shadow-sm md:hidden"
        data-slot="cms-mobile-nav"
      >
        <CmsMenuList
          items={menu.items}
          className="flex flex-col gap-1 pt-2"
          itemClassName="py-2.5 text-base"
        />
      </nav>
    </>
  )
}
