import { initials } from '@alfakit/core'
import { Link, router } from '@inertiajs/react'
import { ChevronsUpDownIcon, LogInIcon, LogOutIcon, UserIcon } from 'lucide-react'
import { useDirection, usePanel, useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
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
import { LocaleSubMenu } from './locale-switcher'
import { MenuItemEntries, MenuItemEntry } from './menu-item'
import { PwaMenuItems } from './pwa'
import { Slot } from './slot'

export function UserAvatar({ className }: { className?: string }) {
  const { user } = usePanel()

  if (!user) return null

  return (
    <Avatar className={cn('size-8 rounded-lg', className)}>
      {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
      <AvatarFallback className="rounded-lg" aria-hidden="true">
        {initials(user.name)}
      </AvatarFallback>
    </Avatar>
  )
}

/**
 * Shown instead of the user menu to guests (panels with `guestAccess()`) when the panel
 * has a login page.
 */
export function SignInLink({ variant = 'sidebar' }: { variant?: 'sidebar' | 'topbar' }) {
  const t = useT()
  const { user, auth } = usePanel()

  if (user || !auth?.login) {
    return null
  }

  return (
    <Link
      href={auth.login}
      data-slot="sign-in-link"
      className={cn(
        'focus-visible:ring-ring/50 flex items-center gap-2 rounded-md text-sm font-medium outline-none focus-visible:ring-[3px] [&_svg]:size-4 [&_svg]:shrink-0',
        variant === 'sidebar'
          ? 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full p-2'
          : 'hover:bg-accent hover:text-accent-foreground h-8 px-3',
      )}
    >
      <LogInIcon className="rtl:rotate-180" aria-hidden="true" />
      <span>{t('sign_in', {}, 'Sign in')}</span>
    </Link>
  )
}

export function UserMenu({ variant = 'sidebar' }: { variant?: 'sidebar' | 'topbar' }) {
  const t = useT()
  const panel = usePanel()
  const direction = useDirection()
  const { user, userMenu } = panel

  if (!user) {
    return <SignInLink variant={variant} />
  }

  if (!userMenu) {
    return null
  }

  const trigger =
    variant === 'sidebar' ? (
      <SidebarMenuButton
        size="lg"
        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
      >
        <UserAvatar />
        <div className="grid flex-1 text-start text-sm leading-tight">
          <span className="truncate font-medium">{user.name}</span>
          {user.email && (
            <span className="text-muted-foreground truncate text-xs">{user.email}</span>
          )}
        </div>
        <Icon
          name="alfakit::panels.user-menu.toggle-button"
          fallback={ChevronsUpDownIcon}
          className="ms-auto size-4"
        />
      </SidebarMenuButton>
    ) : (
      <button
        type="button"
        className="focus-visible:ring-ring/50 rounded-full outline-none focus-visible:ring-[3px]"
        aria-label={user.name}
      >
        <UserAvatar className="rounded-full" />
      </button>
    )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        side={variant === 'sidebar' ? (direction === 'rtl' ? 'left' : 'right') : 'bottom'}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
            <UserAvatar />
            <div className="grid flex-1 leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              {user.email && (
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Slot name="user-menu.before" />
          <Slot name="user-menu.profile.before" />
          {userMenu.profile ? (
            <MenuItemEntry item={userMenu.profile} />
          ) : (
            userMenu.profileUrl && (
              <DropdownMenuItem asChild>
                <Link href={userMenu.profileUrl} className="w-full">
                  <Icon name="alfakit::panels.user-menu.profile-item" fallback={UserIcon} />{' '}
                  {t('profile', {}, 'Profile')}
                </Link>
              </DropdownMenuItem>
            )
          )}
          <Slot name="user-menu.profile.after" />
          <MenuItemEntries items={userMenu.items} />
          <LocaleSubMenu />
          <PwaMenuItems />
          <Slot name="user-menu.after" />
        </DropdownMenuGroup>
        {userMenu.logout !== false && <DropdownMenuSeparator />}
        {userMenu.logout ? (
          <MenuItemEntry item={userMenu.logout} />
        ) : (
          userMenu.logout !== false && (
            <DropdownMenuItem onSelect={() => router.post(userMenu.logoutUrl)}>
              <Icon name="alfakit::panels.user-menu.logout-button" fallback={LogOutIcon} />{' '}
              {t('logout', {}, 'Sign out')}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
