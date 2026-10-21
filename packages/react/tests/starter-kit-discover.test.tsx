import type { AlfakitPageProps, PageSchema } from '@alfakit/core'
import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { useRegistry } from '../src/context'
import { AlfakitStarterKitRoot, createStarterKitPage } from '../src/starter-kit'
import { panel, setPageProps } from './mocks'

// Its own file: the starter kit context is created once per browser session.

function RatingInput({ component }: { component: { props: { label: string } } }) {
  return <p>rating {component.props.label}</p>
}

// What a schema renderer does with a field of type `RatingInput`.
function Field() {
  const Custom = useRegistry().resolve('RatingInput')

  return Custom ? (
    createElement(Custom, { component: { props: { label: 'Stars' } } })
  ) : (
    <p>missing</p>
  )
}

const page = {
  title: 'Posts',
  token: 'token',
  content: [],
  breadcrumbs: [],
} as unknown as PageSchema

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
})

describe('starter kit mode: discover', () => {
  it('auto-registers the components in resources/js/alfakit, as createAlfakit({ discover }) does', async () => {
    setPageProps({ alfakit: { ...panel, starterKit: true }, page } as Partial<AlfakitPageProps>)
    const options = {
      layout: null,
      discover: {
        '../../alfakit/fields/RatingInput.tsx': () => Promise.resolve({ default: RatingInput }),
      },
    }
    const Page = createStarterKitPage(options)
    // The root receives the page's options from its layout callback, as Inertia renders it.
    expect(Page.layout({ page })).toEqual([[AlfakitStarterKitRoot, { options }]])

    render(
      <AlfakitStarterKitRoot options={options}>
        <Page />
        <Field />
      </AlfakitStarterKitRoot>,
    )

    expect(await screen.findByText('rating Stars')).toBeInTheDocument()
    expect(screen.queryByText('missing')).toBeNull()
  })
})
