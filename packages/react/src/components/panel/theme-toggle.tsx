import { hasThemeSwitcher, panelAppearance, setAppearance, type Appearance } from '@alfakit/core'
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useState } from 'react'
import { usePanel, useT } from '../../context'
import { useHydrated } from '../../hooks/use-hydrated'
import { Icon } from '../../lib/icons'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

export function ThemeToggle() {
  const t = useT()
  const panel = usePanel()
  // The stored choice is read only after hydration, so the server render and hydration
  // both draw the panel default.
  const hydrated = useHydrated()
  const [chosen, setLocal] = useState<Appearance | null>(null)
  const appearance: Appearance =
    chosen ?? (hydrated ? panelAppearance(panel) : (panel.darkMode.default ?? 'system'))

  // `themeSwitcher(false)` keeps dark mode but hides the switcher.
  if (!hasThemeSwitcher(panel)) {
    return null
  }

  const change = (value: string) => {
    const next = value as Appearance
    setLocal(next)
    setAppearance(next, panel)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('toggle_theme', {}, 'Toggle theme')}
        >
          {appearance === 'dark' ? (
            <Icon name="alfakit::panels.theme-switcher.dark-button" fallback={MoonIcon} />
          ) : appearance === 'light' ? (
            <Icon name="alfakit::panels.theme-switcher.light-button" fallback={SunIcon} />
          ) : (
            <Icon name="alfakit::panels.theme-switcher.system-button" fallback={MonitorIcon} />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={appearance} onValueChange={change}>
          <DropdownMenuRadioItem value="light">
            <Icon name="alfakit::panels.theme-switcher.light-button" fallback={SunIcon} />{' '}
            {t('light', {}, 'Light')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Icon name="alfakit::panels.theme-switcher.dark-button" fallback={MoonIcon} />{' '}
            {t('dark', {}, 'Dark')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Icon name="alfakit::panels.theme-switcher.system-button" fallback={MonitorIcon} />{' '}
            {t('system', {}, 'System')}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
