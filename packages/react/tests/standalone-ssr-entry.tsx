import type { StandaloneComponentSchema } from '@alfakit/core'
import { renderToString } from 'react-dom/server'
import { AlfakitComponent } from '../src/standalone'

/** Rendered through Vite's SSR pipeline (no jsdom): a host page's server render. */
export function renderStandalone(component: StandaloneComponentSchema): string {
  return renderToString(<AlfakitComponent component={component} />)
}
