import {
  applyPwaUpdate,
  canInstallPwa,
  promptPwaInstall,
  pwaStore,
  startPwa,
  subscribeToPush,
  unsubscribeFromPush,
  type Translator,
} from '@alfakit/core'
import { BellIcon, BellOffIcon, DownloadIcon } from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { usePanel, useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { Icon } from '../../lib/icons'
import { toastOptions } from '../notifications/flash-toasts'
import { DropdownMenuItem } from '../ui/dropdown-menu'

const UPDATE_TOAST_ID = 'alfakit-pwa-update'

/** Show the browser's install prompt, or the "Add to Home Screen" hint on iOS Safari. */
export async function installPwa(t: Translator['t']): Promise<void> {
  if ((await promptPwaInstall()) === 'ios') {
    toast.info(
      t(
        'pwa.ios_hint',
        {},
        'To install this app, tap the Share button and then “Add to Home Screen”.',
      ),
      toastOptions({ duration: 10000 }),
    )
  }
}

/**
 * `Panel::pwa()`: registers the service worker and offers "Reload" when a new version
 * waits. Renders nothing; does nothing without `pwa` or during a server render.
 */
export function PwaManager() {
  const panel = usePanel()
  const t = useT()
  const pwa = panel?.pwa
  const { updateAvailable } = useStore(pwaStore)

  useEffect(() => {
    startPwa(pwa)
  }, [pwa])

  useEffect(() => {
    if (!updateAvailable) return

    toast(
      t('pwa.update_available', {}, 'A new version is available'),
      toastOptions({
        id: UPDATE_TOAST_ID,
        duration: Infinity,
        action: { label: t('pwa.reload', {}, 'Reload'), onClick: () => applyPwaUpdate() },
      }),
    )
  }, [updateAvailable, t])

  return null
}

/** User menu entries: "Install app" and turning Web Push on or off for this browser. */
export function PwaMenuItems() {
  const panel = usePanel()
  const t = useT()
  const state = useStore(pwaStore)

  if (!panel?.pwa) return null

  const push = panel.pwa.push && state.push !== 'unsupported'

  const togglePush = async () => {
    const outcome =
      state.push === 'subscribed' ? await unsubscribeFromPush() : await subscribeToPush()

    if (outcome === 'subscribed') {
      toast.success(
        t('pwa.notifications.enabled', {}, 'Notifications are on for this device'),
        toastOptions(),
      )
    } else if (outcome === 'unsubscribed') {
      toast.success(
        t('pwa.notifications.disabled', {}, 'Notifications are off for this device'),
        toastOptions(),
      )
    } else if (outcome === 'denied') {
      toast.error(
        t('pwa.notifications.blocked', {}, 'Notifications are blocked in your browser settings'),
        toastOptions(),
      )
    } else {
      toast.error(
        t('pwa.notifications.failed', {}, 'Couldn’t change notifications. Try again.'),
        toastOptions(),
      )
    }
  }

  return (
    <>
      {canInstallPwa(state) && (
        <DropdownMenuItem data-slot="pwa-install" onSelect={() => void installPwa(t)}>
          <Icon name="alfakit::panels.user-menu.install-app-item" fallback={DownloadIcon} />{' '}
          {t('pwa.install', {}, 'Install app')}
        </DropdownMenuItem>
      )}
      {push && (
        <DropdownMenuItem
          data-slot="pwa-push"
          disabled={state.pushBusy || state.push === 'denied'}
          onSelect={() => void togglePush()}
        >
          {state.push === 'subscribed' ? (
            <>
              <Icon name="alfakit::panels.user-menu.push-off-item" fallback={BellOffIcon} />{' '}
              {t('pwa.notifications.disable', {}, 'Turn off notifications')}
            </>
          ) : (
            <>
              <Icon name="alfakit::panels.user-menu.push-on-item" fallback={BellIcon} />{' '}
              {t('pwa.notifications.enable', {}, 'Turn on notifications')}
            </>
          )}
        </DropdownMenuItem>
      )}
    </>
  )
}
