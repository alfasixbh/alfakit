<script setup lang="ts">
import { filterTenants, initials, tenantNameText } from '@alfakit/core'
import { Link, router } from '@inertiajs/vue3'
import { CheckIcon, ChevronsUpDownIcon, PlusIcon, SearchIcon, SettingsIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { usePanel, useT } from '../../context'
import { Icon } from '../../lib/icons'
import Avatar from '../ui/Avatar.vue'
import AvatarFallback from '../ui/AvatarFallback.vue'
import AvatarImage from '../ui/AvatarImage.vue'
import DropdownMenu from '../ui/DropdownMenu.vue'
import DropdownMenuContent from '../ui/DropdownMenuContent.vue'
import DropdownMenuItem from '../ui/DropdownMenuItem.vue'
import DropdownMenuLabel from '../ui/DropdownMenuLabel.vue'
import DropdownMenuSeparator from '../ui/DropdownMenuSeparator.vue'
import DropdownMenuTrigger from '../ui/DropdownMenuTrigger.vue'
import SidebarMenuButton from '../ui/SidebarMenuButton.vue'
import MenuItemEntries from './MenuItemEntries.vue'
import MenuItemEntry from './MenuItemEntry.vue'
import NavLabel from './NavLabel.vue'

/**
 * The tenant switcher: a sidebar header button, or a compact button in the top bar of the
 * `topbar` layout (`variant="topbar"`), where the store name shows from `lg` up.
 */
const props = withDefaults(defineProps<{ variant?: 'sidebar' | 'topbar' }>(), {
  variant: 'sidebar',
})

const t = useT()
const panel = usePanel()
const tenancy = computed(() => panel.value.tenancy)
const current = computed(() => tenancy.value?.current)
const search = ref('')
// `tenantSwitcher(false)` sends no tenants; `searchableTenantMenu()` adds a search field.
const hasSwitcher = computed(
  () => tenancy.value?.switcher !== false && (tenancy.value?.tenants.length ?? 0) > 0,
)
const tenants = computed(() =>
  tenancy.value?.searchable
    ? filterTenants(tenancy.value.tenants, search.value)
    : (tenancy.value?.tenants ?? []),
)
</script>

<template>
  <DropdownMenu v-if="tenancy && current">
    <DropdownMenuTrigger as-child>
      <button
        v-if="props.variant === 'topbar'"
        type="button"
        data-slot="tenant-menu"
        class="hover:bg-accent data-[state=open]:bg-accent inline-flex h-9 max-w-60 shrink-0 items-center gap-2 rounded-md px-2 text-sm font-medium"
      >
        <Avatar class="size-6 rounded-md">
          <AvatarImage v-if="current.avatar" :src="current.avatar" alt="" />
          <AvatarFallback class="rounded-md text-[10px]">{{
            initials(tenantNameText(current))
          }}</AvatarFallback>
        </Avatar>
        <span
          class="sr-only min-w-0 truncate lg:not-sr-only lg:grid lg:text-start lg:leading-tight"
        >
          <span
            v-if="current.label"
            data-slot="tenant-menu-label"
            class="text-muted-foreground text-[10px]"
            >{{ current.label }}
          </span>
          <NavLabel class="truncate" :text="current.name" :html="current.nameHtml" />
        </span>
        <Icon
          name="alfakit::panels.tenant-menu.toggle-button"
          :fallback="ChevronsUpDownIcon"
          class="text-muted-foreground size-4 shrink-0"
        />
      </button>
      <SidebarMenuButton v-else size="lg" class="data-[state=open]:bg-sidebar-accent">
        <Avatar class="size-8 rounded-lg">
          <AvatarImage v-if="current.avatar" :src="current.avatar" :alt="tenantNameText(current)" />
          <AvatarFallback class="rounded-lg">{{
            initials(tenantNameText(current))
          }}</AvatarFallback>
        </Avatar>
        <div class="grid flex-1 text-start text-sm leading-tight">
          <!-- `HasCurrentTenantLabel`: a caption above the name instead of the brand. -->
          <span
            v-if="current.label"
            data-slot="tenant-menu-label"
            class="text-muted-foreground truncate text-xs"
            >{{ current.label }}</span
          >
          <NavLabel class="truncate font-medium" :text="current.name" :html="current.nameHtml" />
          <span v-if="!current.label" class="text-muted-foreground truncate text-xs">{{
            panel.brandName
          }}</span>
        </div>
        <Icon
          name="alfakit::panels.tenant-menu.toggle-button"
          :fallback="ChevronsUpDownIcon"
          class="ms-auto size-4"
        />
      </SidebarMenuButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent class="min-w-56 rounded-lg" side="bottom" align="start" :side-offset="4">
      <DropdownMenuLabel v-if="hasSwitcher" class="text-muted-foreground text-xs">{{
        t('tenancy.switch', {}, 'Switch')
      }}</DropdownMenuLabel>
      <div
        v-if="hasSwitcher && tenancy.searchable"
        data-slot="tenant-menu-search"
        class="relative px-1 pb-1"
      >
        <SearchIcon
          class="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2"
          aria-hidden="true"
        />
        <!-- Keep the menu's type-ahead from taking the keys. -->
        <input
          v-model="search"
          type="search"
          :placeholder="t('tenancy.search', {}, 'Search')"
          :aria-label="t('tenancy.search', {}, 'Search')"
          class="border-input focus-visible:ring-ring/50 h-8 w-full rounded-md border bg-transparent ps-7 pe-2 text-sm outline-none focus-visible:ring-[3px]"
          @keydown.stop
        />
      </div>
      <p
        v-if="hasSwitcher && tenancy.searchable && tenants.length === 0"
        class="text-muted-foreground px-2 py-1.5 text-sm"
      >
        {{ t('no_results', {}, 'No results.') }}
      </p>
      <DropdownMenuItem
        v-for="tenant in tenants"
        :key="String(tenant.id)"
        @select="router.visit(tenant.url)"
      >
        <Avatar class="size-6 rounded-sm">
          <AvatarImage v-if="tenant.avatar" :src="tenant.avatar" :alt="tenantNameText(tenant)" />
          <AvatarFallback class="rounded-sm text-[10px]">{{
            initials(tenantNameText(tenant))
          }}</AvatarFallback>
        </Avatar>
        <NavLabel class="flex-1 truncate" :text="tenant.name" :html="tenant.nameHtml" />
        <CheckIcon v-if="String(tenant.id) === String(current.id)" class="size-4" />
      </DropdownMenuItem>
      <DropdownMenuSeparator
        v-if="
          hasSwitcher && (tenancy.registrationUrl || tenancy.profileUrl || tenancy.menu?.length)
        "
      />
      <MenuItemEntry v-if="tenancy.profile" :item="tenancy.profile" menu="tenantMenu" />
      <DropdownMenuItem v-else-if="tenancy.profileUrl" as-child>
        <Link :href="tenancy.profileUrl" class="w-full"
          ><Icon name="alfakit::panels.tenant-menu.profile-button" :fallback="SettingsIcon" />
          {{ tenancy.profileLabel ?? t('tenancy.profile', {}, 'Settings') }}</Link
        >
      </DropdownMenuItem>
      <MenuItemEntries v-if="tenancy.menu" :items="tenancy.menu" menu="tenantMenu" />
      <MenuItemEntry v-if="tenancy.registration" :item="tenancy.registration" menu="tenantMenu" />
      <DropdownMenuItem v-else-if="tenancy.registrationUrl" as-child>
        <Link :href="tenancy.registrationUrl" class="w-full"
          ><Icon name="alfakit::panels.tenant-menu.registration-button" :fallback="PlusIcon" />
          {{ tenancy.registrationLabel ?? t('tenancy.register', {}, 'New') }}</Link
        >
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
