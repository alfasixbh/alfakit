<script lang="ts">
  import type { MenuItemSchema, SubNavigationSchema } from '@alfakit/core'
  import MenuItemEntry from '../src/components/panel/MenuItemEntry.svelte'
  import SubNavigationLayout from '../src/components/panel/SubNavigationLayout.svelte'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
  } from '../src/components/ui/dropdown-menu'
  import { provideAlfakit } from '../src/context.svelte'
  import { context } from './mocks'

  let { navigation, item }: { navigation: SubNavigationSchema; item: MenuItemSchema } = $props()

  provideAlfakit(context)
</script>

<SubNavigationLayout {navigation}><p>Body</p></SubNavigationLayout>
<DropdownMenu open>
  <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
  <DropdownMenuContent>
    <MenuItemEntry {item} />
  </DropdownMenuContent>
</DropdownMenu>
