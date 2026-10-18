<script lang="ts">
  import { CMS_FORM_KEY, type CmsBlockSchema, type CmsFormBlockData } from '@alfakit/core'
  import { useOptionalRegistry } from '../../context.svelte'
  import CmsBlockHeading from './CmsBlockHeading.svelte'
  import { useCms, useSectionClass } from './context'

  let { block, data }: { block: CmsBlockSchema<CmsFormBlockData>; data: CmsFormBlockData } =
    $props()

  const sectionClass = useSectionClass()
  const registry = useOptionalRegistry()
  const cms = useCms()
  const Form = $derived(cms.components[CMS_FORM_KEY] ?? registry?.resolve(CMS_FORM_KEY))
</script>

{#if Form}
  <section data-slot="cms-form" class={sectionClass}>
    <div class="mx-auto max-w-2xl">
      <CmsBlockHeading heading={data.heading} intro={data.description} />
      <Form form={data.payload} formKey={data.form} {block} />
    </div>
  </section>
{:else if cms.preview}
  <!-- Nothing renders the form: visitors see nothing, editors see why in previews. -->
  <p class="text-muted-foreground mx-auto max-w-3xl px-4 py-6 text-center text-sm" role="status">
    {cms.t('cms.form_unavailable', {}, "This form isn't available.")}
  </p>
{/if}
