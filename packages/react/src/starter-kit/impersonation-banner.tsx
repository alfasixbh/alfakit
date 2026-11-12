import type { ImpersonationSchema } from '@alfakit/core'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { ImpersonationBanner } from '../components/panel/impersonation-banner'

// The header components appear in both header layouts and next to each other: the first
// one mounted shows the banner, the others render nothing. When that one goes away (a
// host that renders it conditionally), the next one takes over.
const candidates: symbol[] = []
const listeners = new Set<() => void>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

/**
 * The impersonation banner (who you are signed in as, **Leave**) on the host's own pages,
 * rendered by the header components. Loaded only while impersonating; AlfaKit's pages
 * render their own (`AlfakitRoot`).
 */
export default function StarterKitImpersonationBanner({
  impersonation,
}: {
  impersonation: ImpersonationSchema
}) {
  const [id] = useState(() => Symbol('impersonation-banner'))
  // Claimed once mounted (effects never run on the server), so SSR and hydration skip it.
  const owns = useSyncExternalStore(
    subscribe,
    () => candidates[0] === id,
    () => false,
  )

  useEffect(() => {
    candidates.push(id)
    notify()

    return () => {
      candidates.splice(candidates.indexOf(id), 1)
      notify()
    }
  }, [id])

  return owns ? <ImpersonationBanner impersonation={impersonation} /> : null
}
