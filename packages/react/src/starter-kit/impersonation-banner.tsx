import type { ImpersonationSchema } from '@alfakit/core'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { ImpersonationBanner } from '../components/panel/impersonation-banner'

// The header components appear in both header layouts and next to each other: the first
// one mounted shows the banner, the others render nothing.
let owner: symbol | null = null
const listeners = new Set<() => void>()

function setOwner(next: symbol | null): void {
  owner = next
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
    () => owner === id,
    () => false,
  )

  useEffect(() => {
    if (owner === null) setOwner(id)

    return () => {
      if (owner === id) setOwner(null)
    }
  }, [id])

  return owns ? <ImpersonationBanner impersonation={impersonation} /> : null
}
