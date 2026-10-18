import { collapsesLanguageSwitcher, showsLanguageSwitcher, switchLocale } from '@alfakit/core'
import { LanguagesIcon } from 'lucide-react'
import { createElement } from 'react'
import { useLocalization, useOptionalRegistry, usePanel, useT } from '../../context'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

function useSwitch() {
  const panel = usePanel()

  return (code: string) => {
    if (panel.endpoints.locale && code !== panel.localization.code) {
      switchLocale(panel.endpoints.locale, code)
    }
  }
}

function LocaleOptions() {
  const localization = useLocalization()
  const change = useSwitch()

  return (
    <DropdownMenuRadioGroup value={localization.code} onValueChange={change}>
      {localization.locales.map((locale) => (
        <DropdownMenuRadioItem
          key={locale.code}
          value={locale.code}
          lang={locale.tag}
          data-current={locale.code === localization.code ? 'true' : undefined}
          className="data-[current=true]:font-medium"
        >
          <span lang={locale.tag} dir={locale.direction}>
            {locale.label}
          </span>
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}

/**
 * Stand-alone language menu: a languages button listing each language in its own name
 * (auth pages, top bar). Renders nothing without a switcher.
 */
export function LocaleSwitcher() {
  const t = useT()
  const localization = useLocalization()

  if (!showsLanguageSwitcher(localization, 'auth')) {
    return null
  }

  return (
    <div data-slot="language-switcher" className="flex">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('change_language', {}, 'Change language')}
            title={t('change_language', {}, 'Change language')}
          >
            <LanguagesIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <LocaleOptions />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** Whether the panel has a user menu that can hold the language entry on phones. */
function useHasUserMenu(): boolean {
  const panel = usePanel()

  return Boolean(panel?.user && panel.userMenu)
}

/**
 * The top bars' language button (`languageSwitcher('topbar' | 'both')`): the registered
 * `panel:language-switcher` component or the built-in menu. Below `sm` it moves into the
 * user menu when there is one (`collapsesLanguageSwitcher()`).
 */
export function TopbarLocaleSwitcher() {
  const localization = usePanel()?.localization
  const registry = useOptionalRegistry()
  const collapses = collapsesLanguageSwitcher(localization, useHasUserMenu())

  if (!showsLanguageSwitcher(localization, 'topbar')) {
    return null
  }

  const button = createElement(registry?.resolve('panel:language-switcher') ?? LocaleSwitcher)

  return collapses ? (
    <div className="hidden sm:contents" data-slot="topbar-language">
      {button}
    </div>
  ) : (
    button
  )
}

/**
 * "Language" submenu for the user menu (`languageSwitcher('user-menu' | 'both')`, and
 * below `sm` for `'topbar'`).
 */
export function LocaleSubMenu() {
  const t = useT()
  const localization = useLocalization()
  const hasUserMenu = useHasUserMenu()
  const inMenu = showsLanguageSwitcher(localization, 'user-menu')
  // `languageSwitcher('topbar')`: the top bar's button is hidden on phones, so it's here.
  const onPhones = !inMenu && collapsesLanguageSwitcher(localization, hasUserMenu)

  if (!inMenu && !onPhones) {
    return null
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={onPhones ? 'sm:hidden' : undefined}>
        <LanguagesIcon />
        <span>{t('language', {}, 'Language')}</span>
        <span className="text-muted-foreground ms-auto ps-2 text-xs">{localization.label}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-40">
        <LocaleOptions />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
