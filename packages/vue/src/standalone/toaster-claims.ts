// Who renders AlfaKit's toaster on the page: `<AlfakitToaster>`, `AlfakitRoot`, the first
// standalone component or the starter kit header components on the host's own pages.
let toasters = 0

/** An `<AlfakitToaster>` (or the component that took the role) is mounted; returns a release. */
export function claimToaster(): () => void {
  toasters++

  return () => {
    toasters--
  }
}

export function hasToaster(): boolean {
  return toasters > 0
}
