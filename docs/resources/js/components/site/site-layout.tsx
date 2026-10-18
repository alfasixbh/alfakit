import type { ReactNode } from 'react'
import { Dogfood } from './dogfood'
import { Seo } from './seo'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

/** Header, main landmark and footer of every public page. */
export function SiteLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-svh flex-col">
            <Seo />
            <SiteHeader />
            <main id="main" className="flex-1">
                {children}
            </main>
            <SiteFooter />
            <Dogfood />
        </div>
    )
}
