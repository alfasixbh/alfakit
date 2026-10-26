import { promptPwaInstall, type Translator } from '@alfakit/core'
import { toast } from 'svelte-sonner'
import { toastOptions } from '../notifications/toast'

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
