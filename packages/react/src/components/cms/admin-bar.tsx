import type { CmsAdminBarSchema } from '@alfakit/core'
import { ChevronDownIcon, EyeIcon, LayoutDashboardIcon, PencilIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/button'
import { useCms } from './context'

/**
 * The floating admin bar of public pages (`CmsPlugin::adminBar()`), for signed-in users
 * who can edit the page: Edit, View draft and Back to dashboard. It can be collapsed.
 */
export function CmsAdminBar({ admin }: { admin: CmsAdminBarSchema }) {
  const { t } = useCms()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      aria-label={t('cms.admin_bar', {}, 'Site editing')}
      data-slot="cms-admin-bar"
      className="bg-popover text-popover-foreground fixed end-4 bottom-4 z-50 flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-1 rounded-xl border p-1.5 shadow-lg"
    >
      {!collapsed && (
        <>
          <Button asChild size="sm">
            <a href={admin.editUrl}>
              <PencilIcon aria-hidden="true" />
              {t('cms.edit_page', {}, 'Edit this page')}
            </a>
          </Button>
          {admin.draftUrl && (
            <Button asChild size="sm" variant="ghost">
              <a href={admin.draftUrl}>
                <EyeIcon aria-hidden="true" />
                {t('cms.view_draft', {}, 'View draft')}
              </a>
            </Button>
          )}
          <Button asChild size="sm" variant="ghost">
            <a href={admin.dashboardUrl}>
              <LayoutDashboardIcon className="rtl:-scale-x-100" aria-hidden="true" />
              {t('cms.dashboard', {}, 'Back to dashboard')}
            </a>
          </Button>
          {admin.hasChanges && (
            <span className="text-muted-foreground px-2 text-xs">
              {t('cms.changes_pending', {}, "This page has changes that aren't published yet.")}
            </span>
          )}
        </>
      )}
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <PencilIcon aria-hidden="true" /> : <ChevronDownIcon aria-hidden="true" />}
        <span className="sr-only">
          {collapsed
            ? t('cms.show_admin_bar', {}, 'Show editing bar')
            : t('cms.hide_admin_bar', {}, 'Hide editing bar')}
        </span>
      </Button>
    </aside>
  )
}
