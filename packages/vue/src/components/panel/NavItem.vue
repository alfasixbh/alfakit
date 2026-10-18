<script setup lang="ts">
import { navigationItemText, PREFETCH_CACHE_FOR, type NavigationItemSchema } from '@alfakit/core'
import { Link } from '@inertiajs/vue3'
import { ChevronRightIcon } from '@lucide/vue'
import { badgeColorClasses, colorClass } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Badge from '../ui/Badge.vue'
import Collapsible from '../ui/Collapsible.vue'
import CollapsibleContent from '../ui/CollapsibleContent.vue'
import CollapsibleTrigger from '../ui/CollapsibleTrigger.vue'
import SidebarMenuButton from '../ui/SidebarMenuButton.vue'
import SidebarMenuItem from '../ui/SidebarMenuItem.vue'
import SidebarMenuSub from '../ui/SidebarMenuSub.vue'
import NavSubItem from './NavSubItem.vue'
import NewTabHint from '../../lib/NewTabHint.vue'
import NavLabel from './NavLabel.vue'
import { useT } from '../../context'

const props = defineProps<{ item: NavigationItemSchema }>()
const t = useT()
</script>

<template>
  <Collapsible
    v-if="props.item.children && props.item.children.length > 0"
    as-child
    :default-open="props.item.active"
    class="group/collapsible"
  >
    <SidebarMenuItem>
      <CollapsibleTrigger as-child>
        <SidebarMenuButton
          v-bind="props.item.extraAttributes ?? {}"
          :tooltip="navigationItemText(props.item)"
          :is-active="props.item.active"
        >
          <Icon v-if="props.item.icon" :name="props.item.icon" />
          <NavLabel :text="props.item.label" :html="props.item.labelHtml" />
          <Badge
            v-if="props.item.badge !== undefined && props.item.badge !== null"
            variant="outline"
            :class="
              cn(
                'ms-auto px-1.5 py-0',
                colorClass(badgeColorClasses, props.item.badgeColor, 'gray'),
              )
            "
            :title="props.item.badgeTooltip"
            >{{ props.item.badge }}</Badge
          >
          <span
            v-else-if="props.item.badgePending"
            data-slot="badge"
            aria-busy="true"
            :aria-label="t('loading', {}, 'Loading')"
            class="bg-muted-foreground/20 ms-auto inline-block h-4 w-5 animate-pulse rounded-md"
          />
          <ChevronRightIcon
            class="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180 rtl:group-data-[state=open]/collapsible:rotate-90"
          />
        </SidebarMenuButton>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          <NavSubItem v-for="child in props.item.children" :key="child.label" :item="child" />
        </SidebarMenuSub>
      </CollapsibleContent>
    </SidebarMenuItem>
  </Collapsible>
  <SidebarMenuItem v-else>
    <SidebarMenuButton
      as-child
      :is-active="props.item.active"
      :tooltip="navigationItemText(props.item)"
    >
      <a
        v-if="props.item.openInNewTab"
        v-bind="props.item.extraAttributes ?? {}"
        :href="props.item.url"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icon v-if="props.item.icon" :name="props.item.icon" />
        <NavLabel :text="props.item.label" :html="props.item.labelHtml" />
        <NewTabHint />
        <Badge
          v-if="props.item.badge !== undefined && props.item.badge !== null"
          variant="outline"
          :class="
            cn('ms-auto px-1.5 py-0', colorClass(badgeColorClasses, props.item.badgeColor, 'gray'))
          "
          :title="props.item.badgeTooltip"
          >{{ props.item.badge }}</Badge
        >
        <span
          v-else-if="props.item.badgePending"
          data-slot="badge"
          aria-busy="true"
          :aria-label="t('loading', {}, 'Loading')"
          class="bg-muted-foreground/20 ms-auto inline-block h-4 w-5 animate-pulse rounded-md"
        />
      </a>
      <Link
        v-else
        v-bind="props.item.extraAttributes ?? {}"
        :href="props.item.url ?? '#'"
        prefetch
        :cache-for="PREFETCH_CACHE_FOR"
      >
        <Icon v-if="props.item.icon" :name="props.item.icon" />
        <NavLabel :text="props.item.label" :html="props.item.labelHtml" />
        <Badge
          v-if="props.item.badge !== undefined && props.item.badge !== null"
          variant="outline"
          :class="
            cn('ms-auto px-1.5 py-0', colorClass(badgeColorClasses, props.item.badgeColor, 'gray'))
          "
          :title="props.item.badgeTooltip"
          >{{ props.item.badge }}</Badge
        >
        <span
          v-else-if="props.item.badgePending"
          data-slot="badge"
          aria-busy="true"
          :aria-label="t('loading', {}, 'Loading')"
          class="bg-muted-foreground/20 ms-auto inline-block h-4 w-5 animate-pulse rounded-md"
        />
      </Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
</template>
