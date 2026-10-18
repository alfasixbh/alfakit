<script setup lang="ts">
import { initials, tenantNameText } from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { ChevronsUpDownIcon, PlusIcon } from '@lucide/vue'
import { computed } from 'vue'
import NavLabel from '../../components/panel/NavLabel.vue'
import Avatar from '../../components/ui/Avatar.vue'
import AvatarFallback from '../../components/ui/AvatarFallback.vue'
import AvatarImage from '../../components/ui/AvatarImage.vue'
import DropdownMenu from '../../components/ui/DropdownMenu.vue'
import DropdownMenuContent from '../../components/ui/DropdownMenuContent.vue'
import DropdownMenuItem from '../../components/ui/DropdownMenuItem.vue'
import DropdownMenuLabel from '../../components/ui/DropdownMenuLabel.vue'
import DropdownMenuSeparator from '../../components/ui/DropdownMenuSeparator.vue'
import DropdownMenuTrigger from '../../components/ui/DropdownMenuTrigger.vue'
import { usePanel, useT } from '../../context'
import { Icon } from '../../lib/icons'

/** The user's tenants on a page outside the panel (no current tenant). */
const t = useT()
const panel = usePanel()
const tenancy = computed(() => panel.value.tenancy)
const label = computed(() => t('starter_kit.choose_tenant', {}, 'Choose a tenant'))
const visible = computed(
  () => !!tenancy.value && (tenancy.value.tenants.length > 0 || !!tenancy.value.registrationUrl),
)
</script>

<template>
  <DropdownMenu v-if="tenancy && visible">
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        data-slot="tenant-menu"
        class="hover:bg-accent data-[state=open]:bg-accent inline-flex h-9 max-w-60 shrink-0 items-center gap-2 rounded-md px-2 text-sm font-medium"
      >
        <span class="sr-only lg:not-sr-only lg:truncate">{{ label }}</span>
        <Icon
          name="alfakit::panels.tenant-menu.toggle-button"
          :fallback="ChevronsUpDownIcon"
          class="text-muted-foreground size-4 shrink-0"
        />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent class="min-w-56 rounded-lg" side="bottom" align="end" :side-offset="4">
      <DropdownMenuLabel v-if="tenancy.tenants.length > 0" class="text-muted-foreground text-xs">{{
        label
      }}</DropdownMenuLabel>
      <DropdownMenuItem
        v-for="tenant in tenancy.tenants"
        :key="String(tenant.id)"
        @select="router.visit(tenant.url)"
      >
        <Avatar class="size-6 rounded-sm">
          <AvatarImage v-if="tenant.avatar" :src="tenant.avatar" alt="" />
          <AvatarFallback class="rounded-sm text-[10px]">{{
            initials(tenantNameText(tenant))
          }}</AvatarFallback>
        </Avatar>
        <NavLabel class="flex-1 truncate" :text="tenant.name" :html="tenant.nameHtml" />
      </DropdownMenuItem>
      <template v-if="tenancy.registrationUrl">
        <DropdownMenuSeparator v-if="tenancy.tenants.length > 0" />
        <DropdownMenuItem @select="router.visit(tenancy.registrationUrl!)">
          <Icon name="alfakit::panels.tenant-menu.registration-button" :fallback="PlusIcon" />
          {{ t('tenancy.register', {}, 'New') }}
        </DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
