import type { NavigationItemSchema } from '@alfakit/core'

/**
 * A navigation item's label: text, or the sanitised HTML of an `Htmlable` label
 * (`labelHtml`, sanitised on the server like other HTML in the schema).
 */
export function NavLabel({
  item,
  className,
}: {
  item: Pick<NavigationItemSchema, 'label' | 'labelHtml'>
  className?: string
}) {
  return item.labelHtml ? (
    <span className={className} dangerouslySetInnerHTML={{ __html: item.label }} />
  ) : (
    <span className={className}>{item.label}</span>
  )
}

/** A tenant's name: text, or the sanitised HTML of an `Htmlable` name (`nameHtml`). */
export function TenantName({
  tenant,
  className,
}: {
  tenant: { name: string; nameHtml?: boolean }
  className?: string
}) {
  return tenant.nameHtml ? (
    <span className={className} dangerouslySetInnerHTML={{ __html: tenant.name }} />
  ) : (
    <span className={className}>{tenant.name}</span>
  )
}
