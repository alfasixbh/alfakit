<script setup lang="ts">
import { CMS_FORM_KEY, type CmsBlockSchema, type CmsFormBlockData } from '@alfakit/core'
import { computed } from 'vue'
import { useOptionalRegistry } from '../../context'
import CmsBlockHeading from './CmsBlockHeading.vue'
import { useCms, useSectionClass } from './context'

const props = defineProps<{ block: CmsBlockSchema<CmsFormBlockData>; data: CmsFormBlockData }>()

const sectionClass = useSectionClass()
const registry = useOptionalRegistry()
const cms = useCms()
const form = computed(() => cms.value.components[CMS_FORM_KEY] ?? registry?.resolve(CMS_FORM_KEY))
</script>

<template>
  <section v-if="form" data-slot="cms-form" :class="sectionClass">
    <div class="mx-auto max-w-2xl">
      <CmsBlockHeading :heading="props.data.heading" :intro="props.data.description" />
      <component
        :is="form"
        :form="props.data.payload"
        :form-key="props.data.form"
        :block="props.block"
      />
    </div>
  </section>
  <!-- Nothing renders the form: visitors see nothing, editors see why in previews. -->
  <p
    v-else-if="cms.preview"
    class="text-muted-foreground mx-auto max-w-3xl px-4 py-6 text-center text-sm"
    role="status"
  >
    {{ cms.t('cms.form_unavailable', {}, "This form isn't available.") }}
  </p>
</template>
