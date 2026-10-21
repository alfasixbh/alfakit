import type { AlfakitPageProps, PageSchema } from '@alfakit/core'
import { render, screen } from '@testing-library/svelte'
import { createStarterKitLayout } from '../src/starter-kit'
import { panel, setPageProps } from './mocks'
import StarterKitDiscoverField from './StarterKitDiscoverField.svelte'
import StarterKitDiscoverHarness from './StarterKitDiscoverHarness.svelte'

// Its own file: the starter kit context is created once per browser session.

const page = {
  title: 'Posts',
  token: 'token',
  content: [],
  breadcrumbs: [],
} as unknown as PageSchema

describe('starter kit mode: discover', () => {
  it('auto-registers the components in resources/js/alfakit, as createAlfakit({ discover }) does', async () => {
    setPageProps({ alfakit: { ...panel, starterKit: true }, page } as Partial<AlfakitPageProps>)
    const options = {
      layout: null,
      discover: {
        '../../alfakit/fields/RatingInput.svelte': () =>
          Promise.resolve({ default: StarterKitDiscoverField }),
      },
    }
    const layouts = createStarterKitLayout(options)({ page }) as [unknown, { options: unknown }][]

    expect(layouts.at(-1)![1].options).toBe(options)

    render(StarterKitDiscoverHarness, { props: { options } })

    expect(await screen.findByText('rating Stars')).toBeInTheDocument()
    expect(screen.queryByText('missing')).toBeNull()
  })
})
