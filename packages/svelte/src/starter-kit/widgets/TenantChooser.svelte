<script lang="ts">
  import { initials, tenantNameText } from '@alfakit/core'
  import { router } from '@inertiajs/svelte'
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import NavLabel from '../../components/panel/NavLabel.svelte'
  import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '../../components/ui/dropdown-menu'
  import { usePanel, useT } from '../../context.svelte'
  import Icon from '../../lib/Icon.svelte'

  /** The user's tenants on a page outside the panel (no current tenant). */
  const t = useT()
  const panel = $derived(usePanel())
  const tenancy = $derived(panel.tenancy)
  const label = $derived(t('starter_kit.choose_tenant', {}, 'Choose a tenant'))
</script>

{#if tenancy && (tenancy.tenants.length > 0 || tenancy.registrationUrl)}
  <DropdownMenu>
    <DropdownMenuTrigger>
      {#snippet child({ props })}
        <button
          {...props}
          type="button"
          data-slot="tenant-menu"
          class="hover:bg-accent data-[state=open]:bg-accent inline-flex h-9 max-w-60 shrink-0 items-center gap-2 rounded-md px-2 text-sm font-medium"
        >
          <span class="sr-only lg:not-sr-only lg:truncate">{label}</span>
          <Icon
            name="alfakit::panels.tenant-menu.toggle-button"
            fallback={ChevronsUpDownIcon}
            class="text-muted-foreground size-4 shrink-0"
          />
        </button>
      {/snippet}
    </DropdownMenuTrigger>
    <DropdownMenuContent class="min-w-56 rounded-lg" side="bottom" align="end" sideOffset={4}>
      {#if tenancy.tenants.length > 0}
        <DropdownMenuLabel class="text-muted-foreground text-xs">{label}</DropdownMenuLabel>
      {/if}
      {#each tenancy.tenants as tenant (String(tenant.id))}
        <DropdownMenuItem onSelect={() => router.visit(tenant.url)}>
          <Avatar class="size-6 rounded-sm">
            {#if tenant.avatar}
              <AvatarImage src={tenant.avatar} alt="" />
            {/if}
            <AvatarFallback class="rounded-sm text-[10px]">
              {initials(tenantNameText(tenant))}
            </AvatarFallback>
          </Avatar>
          <NavLabel class="flex-1 truncate" text={tenant.name} html={tenant.nameHtml} />
        </DropdownMenuItem>
      {/each}
      {#if tenancy.registrationUrl}
        {@const registrationUrl = tenancy.registrationUrl}
        {#if tenancy.tenants.length > 0}
          <DropdownMenuSeparator />
        {/if}
        <DropdownMenuItem onSelect={() => router.visit(registrationUrl)}>
          <Icon name="alfakit::panels.tenant-menu.registration-button" fallback={PlusIcon} />
          {tenancy.registrationLabel ?? t('tenancy.register', {}, 'New')}
        </DropdownMenuItem>
      {/if}
    </DropdownMenuContent>
  </DropdownMenu>
{/if}
