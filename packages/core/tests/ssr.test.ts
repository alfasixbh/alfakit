// @vitest-environment node
import { formatKeyBinding, isMacLike, sidebarDefaultOpen } from '../src'

describe('server rendering helpers', () => {
  it('never reports a Mac on the server, whatever Node says about its own platform', () => {
    expect(typeof window).toBe('undefined')
    expect(isMacLike()).toBe(false)
    expect(formatKeyBinding('mod+k')).toBe('Ctrl+K')
  })

  it('starts the sidebar from the stored state the server shares', () => {
    expect(sidebarDefaultOpen(null, 'sidebar')).toBe(true)
    expect(sidebarDefaultOpen(undefined, 'sidebar')).toBe(true)
    expect(sidebarDefaultOpen(false, 'sidebar')).toBe(false)
    expect(sidebarDefaultOpen(true, 'sidebar')).toBe(true)
    // The rail layout starts collapsed until the user expands it.
    expect(sidebarDefaultOpen(null, 'rail')).toBe(false)
    expect(sidebarDefaultOpen(false, 'rail')).toBe(false)
    expect(sidebarDefaultOpen(true, 'rail')).toBe(true)
  })
})
