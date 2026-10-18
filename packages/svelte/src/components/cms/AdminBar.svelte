<script lang="ts">
  import type { CmsAdminBarSchema } from '@alfakit/core'
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import EyeIcon from '@lucide/svelte/icons/eye'
  import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard'
  import PencilIcon from '@lucide/svelte/icons/pencil'
  import { Button } from '../ui/button'
  import { useCms } from './context'

  /**
   * The floating admin bar of public pages (`CmsPlugin::adminBar()`), for signed-in users
   * who can edit the page: Edit, View draft and Back to dashboard. It can be collapsed.
   */
  let { admin }: { admin: CmsAdminBarSchema } = $props()

  const cms = useCms()
  let collapsed = $state(false)
</script>

<aside
  aria-label={cms.t('cms.admin_bar', {}, 'Site editing')}
  data-slot="cms-admin-bar"
  class="bg-popover text-popover-foreground fixed end-4 bottom-4 z-50 flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-1 rounded-xl border p-1.5 shadow-lg"
>
  {#if !collapsed}
    <Button href={admin.editUrl} external size="sm"
      ><PencilIcon aria-hidden="true" />{cms.t('cms.edit_page', {}, 'Edit this page')}</Button
    >
    {#if admin.draftUrl}
      <Button href={admin.draftUrl} external size="sm" variant="ghost"
        ><EyeIcon aria-hidden="true" />{cms.t('cms.view_draft', {}, 'View draft')}</Button
      >
    {/if}
    <Button href={admin.dashboardUrl} external size="sm" variant="ghost">
      <LayoutDashboardIcon class="rtl:-scale-x-100" aria-hidden="true" />{cms.t(
        'cms.dashboard',
        {},
        'Back to dashboard',
      )}
    </Button>
    {#if admin.hasChanges}
      <span class="text-muted-foreground px-2 text-xs"
        >{cms.t(
          'cms.changes_pending',
          {},
          "This page has changes that aren't published yet.",
        )}</span
      >
    {/if}
  {/if}
  <Button
    type="button"
    size="icon-sm"
    variant="ghost"
    aria-expanded={!collapsed}
    onclick={() => (collapsed = !collapsed)}
  >
    {#if collapsed}<PencilIcon aria-hidden="true" />{:else}<ChevronDownIcon
        aria-hidden="true"
      />{/if}
    <span class="sr-only"
      >{collapsed
        ? cms.t('cms.show_admin_bar', {}, 'Show editing bar')
        : cms.t('cms.hide_admin_bar', {}, 'Hide editing bar')}</span
    >
  </Button>
</aside>
