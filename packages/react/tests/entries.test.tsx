import { fireEvent, render, screen } from '@testing-library/react'
import { ColorEntryComponent, IconEntryComponent } from '../src/components/entries/other-entries'
import { Wrapper } from './mocks'

describe('entries', () => {
  it('links non-text entries to their url', () => {
    render(
      <Wrapper>
        <IconEntryComponent
          component={{
            type: 'IconEntry',
            key: 'status',
            name: 'status',
            label: 'Status',
            icon: 'circle-check',
            url: '/posts/1',
          }}
        />
      </Wrapper>,
    )

    expect(screen.getByRole('link')).toHaveAttribute('href', '/posts/1')
  })

  it('styles and copies colour codes with the copy message', async () => {
    const writeText = vi.fn(async () => undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(
      <Wrapper>
        <ColorEntryComponent
          component={{
            type: 'ColorEntry',
            key: 'color',
            name: 'color',
            label: 'Colour',
            state: '#ff0000',
            copyable: true,
            copyMessage: 'Colour copied',
            weight: 'black',
          }}
        />
      </Wrapper>,
    )

    expect(screen.getByText('#ff0000').closest('.font-black')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    expect(writeText).toHaveBeenCalledWith('#ff0000')
    expect(await screen.findByRole('status')).toHaveTextContent('Colour copied')
  })
})
