<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3'
import { ChevronsUpDownIcon, LogOutIcon, UserIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useDirection, usePanel, useT } from '../../context'
import { Icon } from '../../lib/icons'
import DropdownMenu from '../ui/DropdownMenu.vue'
import DropdownMenuContent from '../ui/DropdownMenuContent.vue'
import DropdownMenuGroup from '../ui/DropdownMenuGroup.vue'
import DropdownMenuItem from '../ui/DropdownMenuItem.vue'
import DropdownMenuLabel from '../ui/DropdownMenuLabel.vue'
import DropdownMenuSeparator from '../ui/DropdownMenuSeparator.vue'
import DropdownMenuTrigger from '../ui/DropdownMenuTrigger.vue'
import SidebarMenuButton from '../ui/SidebarMenuButton.vue'
import LocaleSubMenu from './LocaleSubMenu.vue'
import SignInLink from './SignInLink.vue'
import Slot from './Slot.vue'
import UserAvatar from './UserAvatar.vue'
import MenuItemEntries from './MenuItemEntries.vue'
import MenuItemEntry from './MenuItemEntry.vue'
import PwaMenuItems from './PwaMenuItems.vue'

const props = withDefaults(defineProps<{ variant?: 'sidebar' | 'topbar' }>(), {
  variant: 'sidebar',
})
const t = useT()
const panel = usePanel()
const direction = useDirection()
const user = computed(() => panel.value.user)
const userMenu = computed(() => panel.value.userMenu)
</script>

<template>
  <SignInLink v-if="!user" :variant="props.variant" />
  <DropdownMenu v-else-if="userMenu">
    <DropdownMenuTrigger as-child>
      <SidebarMenuButton
        v-if="props.variant === 'sidebar'"
        size="lg"
        class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
      >
        <UserAvatar />
        <div class="grid flex-1 text-start text-sm leading-tight">
          <span class="truncate font-medium">{{ user.name }}</span>
          <span v-if="user.email" class="text-muted-foreground truncate text-xs">{{
            user.email
          }}</span>
        </div>
        <Icon
          name="alfakit::panels.user-menu.toggle-button"
          :fallback="ChevronsUpDownIcon"
          class="ms-auto size-4"
        />
      </SidebarMenuButton>
      <button
        v-else
        type="button"
        class="focus-visible:ring-ring/50 rounded-full outline-none focus-visible:ring-[3px]"
        :aria-label="user.name"
      >
        <UserAvatar class="rounded-full" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      class="min-w-56 rounded-lg"
      :side="props.variant === 'sidebar' ? (direction === 'rtl' ? 'left' : 'right') : 'bottom'"
      align="end"
      :side-offset="4"
    >
      <DropdownMenuLabel class="p-0 font-normal">
        <div class="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
          <UserAvatar />
          <div class="grid flex-1 leading-tight">
            <span class="truncate font-medium">{{ user.name }}</span>
            <span v-if="user.email" class="text-muted-foreground truncate text-xs">{{
              user.email
            }}</span>
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <Slot name="user-menu.before" />
        <Slot name="user-menu.profile.before" />
        <MenuItemEntry v-if="userMenu.profile" :item="userMenu.profile" />
        <DropdownMenuItem v-else-if="userMenu.profileUrl" as-child>
          <Link :href="userMenu.profileUrl" class="w-full"
            ><Icon name="alfakit::panels.user-menu.profile-item" :fallback="UserIcon" />
            {{ t('profile', {}, 'Profile') }}</Link
          >
        </DropdownMenuItem>
        <Slot name="user-menu.profile.after" />
        <MenuItemEntries :items="userMenu.items" />
        <LocaleSubMenu />
        <PwaMenuItems />
        <Slot name="user-menu.after" />
      </DropdownMenuGroup>
      <DropdownMenuSeparator v-if="userMenu.logout !== false" />
      <MenuItemEntry v-if="userMenu.logout" :item="userMenu.logout" />
      <DropdownMenuItem
        v-else-if="userMenu.logout !== false"
        @select="router.post(userMenu.logoutUrl)"
        ><Icon name="alfakit::panels.user-menu.logout-button" :fallback="LogOutIcon" />
        {{ t('logout', {}, 'Sign out') }}</DropdownMenuItem
      >
    </DropdownMenuContent>
  </DropdownMenu>
</template>
