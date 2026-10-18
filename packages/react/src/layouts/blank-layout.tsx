import type { ReactNode } from 'react'

export function BlankLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-svh">{children}</div>
}
