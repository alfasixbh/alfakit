/**
 * The page's Content Security Policy nonce, read from the server-rendered tags that carry it
 * (the root view's inline theme `<script>`/`<style>`, Vite's tags). Elements AlfaKit and
 * Inertia add at runtime (the progress bar's `<style>`, on-request assets) take it, so a
 * nonce-based policy (docs: advanced/security § Content Security Policy) allows them.
 * `undefined` on the server and on pages without a nonce.
 */
export function documentNonce(): string | undefined {
  if (typeof document === 'undefined') return undefined

  return document.querySelector<HTMLElement>('script[nonce], style[nonce]')?.nonce || undefined
}
