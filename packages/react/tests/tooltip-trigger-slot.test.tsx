import { render, screen } from '@testing-library/react'
import { Button } from '../src/components/ui/button'
import { Tooltip, TooltipProvider, TooltipTrigger } from '../src/components/ui/tooltip'

describe('TooltipTrigger', () => {
  it("keeps the child's data-slot with asChild (an action button stays a `button`)", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button">Delete</Button>
          </TooltipTrigger>
        </Tooltip>
      </TooltipProvider>,
    )

    expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute('data-slot', 'button')
  })

  it('marks its own trigger element', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Help</TooltipTrigger>
        </Tooltip>
      </TooltipProvider>,
    )

    expect(screen.getByRole('button', { name: 'Help' })).toHaveAttribute(
      'data-slot',
      'tooltip-trigger',
    )
  })
})
