<script setup lang="ts">
import { cmsBlockAttributes, cmsBlockKey, cmsBlocks, type CmsBlockSchema } from '@alfakit/core'
import { computed, inject, provide } from 'vue'
import { useOptionalRegistry, type AnyComponent } from '../../context'
import { CMS_BLOCK_COMPONENTS } from './blocks'
import { CMS_COMPONENTS_KEY, useCms } from './context'

/**
 * Renders rendered CMS blocks (`page.blocks`, `Cms::blocks()`, the JSON API). Each type
 * resolves, in order, to `components[type]`, the registry's `cms:block:{type}` and the
 * built-in renderer; unknown types render nothing.
 */
const props = defineProps<{
  blocks: CmsBlockSchema[] | null | undefined
  components?: Record<string, AnyComponent>
}>()

const registry = useOptionalRegistry()
const cms = useCms()
const outer = inject(CMS_COMPONENTS_KEY, {})
const merged = computed(() => (props.components ? { ...outer, ...props.components } : outer))

// Blocks inside columns resolve with the same components.
provide(CMS_COMPONENTS_KEY, merged.value)

const rendered = computed(() =>
  cmsBlocks(props.blocks)
    .map((block) => ({
      block,
      component:
        merged.value[block.type] ??
        cms.value.components[block.type] ??
        registry?.resolve(cmsBlockKey(block.type)) ??
        CMS_BLOCK_COMPONENTS[block.type],
    }))
    .filter(
      (entry): entry is { block: CmsBlockSchema; component: AnyComponent } =>
        entry.component !== undefined,
    ),
)
</script>

<template>
  <div
    v-for="entry in rendered"
    :key="entry.block.id"
    v-bind="cmsBlockAttributes(entry.block)"
    data-slot="cms-block"
    :data-cms-block="entry.block.type"
  >
    <component :is="entry.component" :block="entry.block" :data="entry.block.data" />
  </div>
</template>
