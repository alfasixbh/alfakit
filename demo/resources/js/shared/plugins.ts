import type { CmsPayload, StandaloneComponentSchema } from '@alfakit/core'

/**
 * Storefront props of the first-party plugins (App\Demo\StorefrontPlugins::shared(), shared
 * as `plugins`), and the props of the plugin pages (App\Http\Controllers\StorefrontPluginsController,
 * the helpdesk portal and the public forms route). Used by the React, Vue and Svelte shops.
 */
export interface StorefrontMenuItem {
    id: string
    label: string
    url: string | null
    newTab: boolean
    current: boolean
    active: boolean
}

export interface StorefrontPluginsCopy {
    pages: string
    wholesale: string
    support: string
    chat: string
    wholesale_title: string
    wholesale_intro: string
    wholesale_unavailable: string
    support_title: string
    support_intro: string
    new_checkout: string
    cms_intro: string
}

export interface StorefrontPluginsShared {
    analyticsKey: string | null
    chat: boolean
    newCheckout: boolean
    wholesale: boolean
    announcement: string | null
    menu: StorefrontMenuItem[]
    links: { wholesale: string; support: string }
    copy: StorefrontPluginsCopy
}

export interface CmsStorefrontPageProps {
    cms: CmsPayload
    intro: string
}

export interface WholesalePageProps {
    form: StandaloneComponentSchema | null
    copy: StorefrontPluginsCopy
}

export interface SupportPageProps {
    components: StandaloneComponentSchema[]
    meta: {
        view: 'index' | 'create' | 'show' | 'contact' | 'rate'
        title: string
        appName: string
        signedIn: boolean
        links: { portal?: string; newTicket?: string; contact?: string }
        labels: { portal: string; newTicket: string; contact: string; navigation: string }
    }
}

export interface FormPageProps {
    form: StandaloneComponentSchema
    meta: { title: string; description: string | null; slug: string; preview: boolean }
}

/** The helpdesk portal's own navigation, filtered like the plugin's page stub. */
export function supportLinks(
    meta: SupportPageProps['meta'],
): { href: string; label: string; current: boolean }[] {
    return [
        meta.signedIn && meta.links.portal
            ? { href: meta.links.portal, label: meta.labels.portal, current: meta.view === 'index' }
            : null,
        meta.signedIn && meta.links.newTicket
            ? {
                  href: meta.links.newTicket,
                  label: meta.labels.newTicket,
                  current: meta.view === 'create',
              }
            : null,
        meta.links.contact
            ? {
                  href: meta.links.contact,
                  label: meta.labels.contact,
                  current: meta.view === 'contact',
              }
            : null,
    ].filter((link): link is { href: string; label: string; current: boolean } => link !== null)
}

/** The CMS menu, the wholesale page (when its flag is on) and support, for the shop's nav. */
export function storefrontPluginLinks(
    plugins: StorefrontPluginsShared | null | undefined,
): { key: string; href: string; label: string; current: boolean }[] {
    if (!plugins) return []

    return [
        ...plugins.menu.map((item) => ({
            key: item.id,
            href: item.url ?? '#',
            label: item.label,
            current: item.current,
        })),
        ...(plugins.wholesale
            ? [
                  {
                      key: 'wholesale',
                      href: plugins.links.wholesale,
                      label: plugins.copy.wholesale,
                      current: false,
                  },
              ]
            : []),
        {
            key: 'support',
            href: plugins.links.support,
            label: plugins.copy.support,
            current: false,
        },
    ]
}

/** The header keeps it short: the first page of the CMS menu and the wholesale page. */
export function storefrontHeaderLinks(
    plugins: StorefrontPluginsShared | null | undefined,
): { key: string; href: string; label: string; current: boolean }[] {
    const links = storefrontPluginLinks(plugins)

    return links.filter((link, index) => index === 0 || link.key === 'wholesale')
}
