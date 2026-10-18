<script setup lang="ts">
import type { CmsAdminBarSchema } from '@alfakit/core'
import { ChevronDownIcon, EyeIcon, LayoutDashboardIcon, PencilIcon } from '@lucide/vue'
import { ref } from 'vue'
import Button from '../ui/Button.vue'
import { useCmsT } from './context'

/**
 * The floating admin bar of public pages (`CmsPlugin::adminBar()`), for signed-in users
 * who can edit the page: Edit, View draft and Back to dashboard. It can be collapsed.
 */
const props = defineProps<{ admin: CmsAdminBarSchema }>()

const t = useCmsT()
const collapsed = ref(false)
</script>

<template>
  <aside
    :aria-label="t('cms.admin_bar', {}, 'Site editing')"
    data-slot="cms-admin-bar"
    class="bg-popover text-popover-foreground fixed end-4 bottom-4 z-50 flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-1 rounded-xl border p-1.5 shadow-lg"
  >
    <template v-if="!collapsed">
      <Button as-child size="sm">
        <a :href="props.admin.editUrl"
          ><PencilIcon aria-hidden="true" />{{ t('cms.edit_page', {}, 'Edit this page') }}</a
        >
      </Button>
      <Button v-if="props.admin.draftUrl" as-child size="sm" variant="ghost">
        <a :href="props.admin.draftUrl"
          ><EyeIcon aria-hidden="true" />{{ t('cms.view_draft', {}, 'View draft') }}</a
        >
      </Button>
      <Button as-child size="sm" variant="ghost">
        <a :href="props.admin.dashboardUrl"
          ><LayoutDashboardIcon class="rtl:-scale-x-100" aria-hidden="true" />{{
            t('cms.dashboard', {}, 'Back to dashboard')
          }}</a
        >
      </Button>
      <span v-if="props.admin.hasChanges" class="text-muted-foreground px-2 text-xs">{{
        t('cms.changes_pending', {}, "This page has changes that aren't published yet.")
      }}</span>
    </template>
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      :aria-expanded="!collapsed"
      @click="collapsed = !collapsed"
    >
      <PencilIcon v-if="collapsed" aria-hidden="true" />
      <ChevronDownIcon v-else aria-hidden="true" />
      <span class="sr-only">{{
        collapsed
          ? t('cms.show_admin_bar', {}, 'Show editing bar')
          : t('cms.hide_admin_bar', {}, 'Hide editing bar')
      }}</span>
    </Button>
  </aside>
</template>
