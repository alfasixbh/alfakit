import type { ReactNode } from 'react'
import { Brand } from '../components/panel/app-sidebar'
import { LocaleSwitcher } from '../components/panel/locale-switcher'
import { Slot } from '../components/panel/slot'
import { ThemeToggle } from '../components/panel/theme-toggle'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { usePanel } from '../context'
import { cn } from '../lib/utils'
import { MAX_WIDTHS } from './app-layout'

export interface AuthLayoutProps {
  children: ReactNode
  heading?: string
  subheading?: string
}

/** Centered card used by login, registration, password reset and simple profile pages. */
export function AuthLayout({ children, heading, subheading }: AuthLayoutProps) {
  // `simplePageMaxContentWidth()` on the panel; `md` by default.
  const width = usePanel()?.simplePageMaxContentWidth ?? 'md'

  return (
    <div className="bg-muted/40 flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <Slot name="simple.layout.start" />
      <div className="absolute end-4 top-4 flex items-center gap-1">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
      <div className={cn('flex w-full flex-col gap-6', MAX_WIDTHS[width] ?? 'max-w-md')}>
        <div className="flex justify-center">
          <Brand />
        </div>
        <Slot name="auth.before" />
        <Card>
          <Slot name="simple.page.start" />
          {(heading || subheading) && (
            <CardHeader className="text-center">
              {heading && (
                <CardTitle role="heading" aria-level={1} className="text-xl">
                  {heading}
                </CardTitle>
              )}
              {subheading && <CardDescription>{subheading}</CardDescription>}
            </CardHeader>
          )}
          <CardContent>
            {/* The server sends each form's slots on its own page only (Slot::pageTypes()). */}
            <Slot name="auth.login.form.before" />
            <Slot name="auth.register.form.before" />
            <Slot name="auth.password-reset.request.form.before" />
            <Slot name="auth.password-reset.reset.form.before" />
            {children}
            <Slot name="auth.login.form.after" />
            <Slot name="auth.register.form.after" />
            <Slot name="auth.password-reset.request.form.after" />
            <Slot name="auth.password-reset.reset.form.after" />
          </CardContent>
          <Slot name="simple.page.end" />
        </Card>
        <Slot name="auth.after" />
        <Slot name="footer" />
      </div>
      <Slot name="simple.layout.end" />
    </div>
  )
}
