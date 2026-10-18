import { useT } from '../context'

/** Screen-reader text for a link that opens in a new tab. */
export function NewTabHint() {
  const t = useT()

  return <span className="sr-only"> {t('opens_in_new_tab', {}, '(opens in a new tab)')}</span>
}
