<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down'
  import LogOutIcon from '@lucide/svelte/icons/log-out'
  import UserIcon from '@lucide/svelte/icons/user'
  import { useDirection, usePanel, useT } from '../../context.svelte'
  import Icon from '../../lib/Icon.svelte'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '../ui/dropdown-menu'
  import { SidebarMenuButton } from '../ui/sidebar'
  import LocaleSubMenu from './LocaleSubMenu.svelte'
  import SignInLink from './SignInLink.svelte'
  import Slot from './Slot.svelte'
  import UserAvatar from './UserAvatar.svelte'
  import MenuItemEntries from './MenuItemEntries.svelte'
  import MenuItemEntry from './MenuItemEntry.svelte'
  import PwaMenuItems from './PwaMenuItems.svelte'

  let { variant = 'sidebar' }: { variant?: 'sidebar' | 'topbar' } = $props()

  const t = useT()
  const panel = $derived(usePanel())
  const user = $derived(panel.user)
  const userMenu = $derived(panel.userMenu)
  const direction = $derived(useDirection())
</script>

{#if !user}
  <SignInLink {variant} />
{:else if userMenu}
  <DropdownMenu>
    <DropdownMenuTrigger>
      {#snippet child({ props })}
        {#if variant === 'sidebar'}
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            {...props}
          >
            <UserAvatar />
            <div class="grid flex-1 text-start text-sm leading-tight">
              <span class="truncate font-medium">{user.name}</span>
              {#if user.email}<span class="text-muted-foreground truncate text-xs"
                  >{user.email}</span
                >{/if}
            </div>
            <Icon
              name="alfakit::panels.user-menu.toggle-button"
              fallback={ChevronsUpDownIcon}
              class="ms-auto size-4"
            />
          </SidebarMenuButton>
        {:else}
          <button
            type="button"
            class="focus-visible:ring-ring/50 rounded-full outline-none focus-visible:ring-[3px]"
            aria-label={user.name}
            {...props}
          >
            <UserAvatar class="rounded-full" />
          </button>
        {/if}
      {/snippet}
    </DropdownMenuTrigger>
    <DropdownMenuContent
      class="min-w-56 rounded-lg"
      side={variant === 'sidebar' ? (direction === 'rtl' ? 'left' : 'right') : 'bottom'}
      align="end"
      sideOffset={4}
    >
      <DropdownMenuLabel class="p-0 font-normal">
        <div class="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
          <UserAvatar />
          <div class="grid flex-1 leading-tight">
            <span class="truncate font-medium">{user.name}</span>
            {#if user.email}<span class="text-muted-foreground truncate text-xs">{user.email}</span
              >{/if}
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <Slot name="user-menu.before" />
        <Slot name="user-menu.profile.before" />
        {#if userMenu.profile}
          <MenuItemEntry item={userMenu.profile} />
        {:else if userMenu.profileUrl}
          <DropdownMenuItem onSelect={() => router.visit(userMenu.profileUrl ?? '/')}>
            <Icon name="alfakit::panels.user-menu.profile-item" fallback={UserIcon} />
            {t('profile', {}, 'Profile')}
          </DropdownMenuItem>
        {/if}
        <Slot name="user-menu.profile.after" />
        <MenuItemEntries items={userMenu.items} />
      </DropdownMenuGroup>
      <LocaleSubMenu />
      <PwaMenuItems />
      <Slot name="user-menu.after" />
      {#if userMenu.logout !== false}<DropdownMenuSeparator />{/if}
      {#if userMenu.logout}
        <MenuItemEntry item={userMenu.logout} />
      {:else if userMenu.logout !== false}
        <DropdownMenuItem onSelect={() => router.post(userMenu.logoutUrl)}>
          <Icon name="alfakit::panels.user-menu.logout-button" fallback={LogOutIcon} />
          {t('logout', {}, 'Sign out')}
        </DropdownMenuItem>
      {/if}
    </DropdownMenuContent>
  </DropdownMenu>
{/if}
